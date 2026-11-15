package com.fitlog.backend.controller;
import com.fitlog.backend.entity.*;
import com.fitlog.backend.repository.*;
import com.fitlog.backend.security.CurrentUser;
import org.springframework.data.domain.*;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.sql.Timestamp;
import java.util.*;

@RestController @RequestMapping("/api/admin")
public class AdminController {
 private final UserRepository users;
 private final WorkoutRepository workouts;
 private final GoalRepository goals;
 private final ReminderRepository reminders;
 private final WorkoutPlanRepository plans;
 private final AdminAuditRepository audits;
 private final JdbcTemplate jdbc;
 public AdminController(UserRepository users,WorkoutRepository workouts,GoalRepository goals,
   ReminderRepository reminders,WorkoutPlanRepository plans,AdminAuditRepository audits,JdbcTemplate jdbc){
  this.users=users;this.workouts=workouts;this.goals=goals;this.reminders=reminders;
  this.plans=plans;this.audits=audits;this.jdbc=jdbc;
 }
 private long count(String sql,Object... args){Long n=jdbc.queryForObject(sql,Long.class,args);return n==null?0:n;}
 private List<Map<String,Object>> rows(String sql,Object... args){return jdbc.queryForList(sql,args);}
 @GetMapping("/summary") public Map<String,Object> summary(){
  Instant week=Instant.now().minus(Duration.ofDays(7));
  Map<String,Object> data=new LinkedHashMap<>();
  data.put("totalUsers",users.count());data.put("activeUsers",count("select count(*) from users where enabled=1"));
  data.put("newUsers7d",count("select count(*) from users where created_at>=?",java.sql.Timestamp.from(week)));
  data.put("totalWorkouts",workouts.count());data.put("workouts7d",count("select count(*) from workouts where created_at>=?",java.sql.Timestamp.from(week)));
  long totalGoals=goals.count();
  long completedGoals=count("""
   select count(*) from goals g
   where g.target>0 and g.target<=coalesce((
    select case g.metric
     when 'sessions' then count(*)
     when 'minutes' then coalesce(sum(w.duration),0)
     when 'distance' then coalesce(sum(w.distance),0)
     when 'calories' then coalesce(sum(w.calories),0)
     else 0
    end
    from workouts w
    where w.user_id=g.user_id and (g.workout_type='all' or w.type=g.workout_type)
     and w.date between
      case when g.period='week' then date_sub(curdate(), interval weekday(curdate()) day)
       else cast(date_format(curdate(), '%Y-%m-01') as date) end
      and case when g.period='week' then date_add(date_sub(curdate(), interval weekday(curdate()) day), interval 6 day)
       else last_day(curdate()) end
   ),0)
  """);
  data.put("totalGoals",totalGoals);data.put("completedGoals",completedGoals);
  data.put("totalReminders",reminders.count());data.put("totalPlans",plans.count());
  data.put("upcomingPlans7d",count("select count(*) from workout_plans where status='PLANNED' and date>=curdate() and date<date_add(curdate(), interval 7 day)"));
  data.put("completedPlans7d",count("select count(*) from workout_plans where date>=date_sub(curdate(), interval 7 day) and date<curdate() and status='COMPLETED'"));
  data.put("scheduledPlans7d",count("select count(*) from workout_plans where date>=date_sub(curdate(), interval 7 day) and date<curdate()"));
  long consenting=count("select count(*) from users where analytics_enabled=1 and role='USER'");
  data.put("trackingOptIn",consenting);
  // Optional AI tables may not exist on older local databases; admin dashboard should still work.
  try{data.put("aiKnowledgeCount",count("select count(*) from ai_knowledge"));}catch(DataAccessException ex){data.put("aiKnowledgeCount",null);}
  try{data.put("aiChatMessageCount",count("select count(*) from ai_chat_messages"));}catch(DataAccessException ex){data.put("aiChatMessageCount",null);}
  data.put("dailyWorkouts",rows("select date(date) as day,count(*) as count from workouts where date>=current_date - interval 6 day group by date(date) order by day"));
  data.put("workoutTypes",rows("select type as label,count(*) as count from workouts group by type order by count desc limit 8"));
  data.put("registrations",rows("select date(created_at) as day,count(*) as count from users where created_at >= current_date - interval 6 day group by date(created_at) order by day"));
  return data;
 }
 public record UserRow(String id,String name,String email,String role,boolean enabled,boolean analyticsEnabled,Instant createdAt,long workouts){
  public static UserRow of(User u,long workouts){return new UserRow(u.id,u.name,u.email,u.role,u.enabled,u.analyticsEnabled,u.createdAt,workouts);}
 }
 @GetMapping("/users") public Map<String,Object> users(@RequestParam(defaultValue="") String q,
     @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="15") int size){
  if(page<0||size<1||size>50||q.length()>100)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  Page<User> result=users.adminSearch(q.trim(),PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"createdAt")));
  return Map.of("items",result.getContent().stream().map(u->UserRow.of(u,workouts.countByUserId(u.id))).toList(),
    "total",result.getTotalElements(),"page",page,"size",size);
 }
 public record SetEnabled(boolean enabled,String reason) {}
 @PatchMapping("/users/{id}/enabled") @Transactional
 public UserRow setEnabled(@PathVariable String id,@RequestBody SetEnabled request,Authentication auth){
  String actorId=CurrentUser.from(auth).id();
  User target=users.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
  if(actorId.equals(id)&&!request.enabled())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Không thể khóa chính mình.");
  if(target.role.equals("ADMIN")&&!request.enabled())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Không cho phép khóa tài khoản ADMIN ở giao diện.");
  String reason=request.reason()==null?"":request.reason().trim();
  if(reason.length()<5||reason.length()>500)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Lý do phải từ 5 đến 500 ký tự.");
  target.enabled=request.enabled();users.save(target);
  AdminAuditLog log=new AdminAuditLog();log.actor=users.getReferenceById(actorId);
  log.action=request.enabled()?"ENABLE_USER":"DISABLE_USER";log.targetId=id;log.reason=reason;audits.save(log);
  return UserRow.of(target,workouts.countByUserId(target.id));
 }
 @GetMapping("/tracking") public Map<String,Object> tracking(@RequestParam(defaultValue="7") int days){
  if(days!=7&&days!=30&&days!=90)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Chỉ hỗ trợ 7, 30 hoặc 90 ngày");
  LocalDate today=LocalDate.now(ZoneOffset.UTC);
  Instant since=today.minusDays(days-1).atStartOfDay(ZoneOffset.UTC).toInstant();
  Timestamp from=Timestamp.from(since);
  String eligible=" from user_activity_events e join users u on u.id=e.user_id where e.created_at>=? and u.analytics_enabled=1 and u.role='USER' ";
  long consenting=count("select count(*) from users where analytics_enabled=1 and role='USER'");
  long totalUsers=count("select count(*) from users where role='USER'");
  long unique=count("select count(distinct e.user_id)"+eligible,from);
  Map<String,Object> output=new LinkedHashMap<>();
  output.put("consentingUsers",consenting);output.put("totalUsers",totalUsers);
  output.put("uniqueUsers",unique);
  long total=count("select count(*)"+eligible,from);
  long views=count("select count(*)"+eligible+" and e.event_type='screen_view'",from);
  output.put("totalEvents",total);output.put("screenViews",views);
  output.put("meaningfulActions",total-views);
  output.put("averageEventsPerUser",unique>0?Math.round((double)total/unique*10.0)/10.0:0);
  output.put("screens",rows("select e.screen_name as label,count(*) as count"+eligible+" and e.event_type='screen_view' group by e.screen_name order by count desc",from));
  output.put("events",rows("select e.event_type as label,count(*) as count"+eligible+" and e.event_type<>'screen_view' group by e.event_type order by count desc",from));
  Map<String,Long> counts=new HashMap<>();
  for(Map<String,Object> r:rows("select date(e.created_at) as day,count(*) as count"+eligible+" group by date(e.created_at) order by day",from)){
   counts.put(String.valueOf(r.get("day")),((Number)r.get("count")).longValue());
  }
  List<Map<String,Object>> daily=new ArrayList<>();
  for(int i=days-1;i>=0;i--){
   String day=today.minusDays(i).toString();
   daily.add(Map.of("day",day,"count",counts.getOrDefault(day,0L)));
  }
  output.put("daily",daily);
  return output;
 }
 public record AuditRow(String action,String targetId,Instant createdAt,String actorName,String actorEmail,String targetName,String targetEmail,String reason) {}
 @GetMapping("/audit") @Transactional(readOnly=true) public Map<String,Object> audit(@RequestParam(defaultValue="0") int page){
  if(page<0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  Page<AdminAuditLog> result=audits.findAllByOrderByCreatedAtDesc(PageRequest.of(page,20));
  List<AuditRow> items=result.getContent().stream().map(a->{
   User target=a.targetId==null?null:users.findById(a.targetId).orElse(null);
   return new AuditRow(a.action,a.targetId,a.createdAt,
    a.actor==null?null:a.actor.name,a.actor==null?null:a.actor.email,
    target==null?null:target.name,target==null?null:target.email,a.reason);
  }).toList();
  return Map.of("items",items,"page",page,"total",result.getTotalElements());
 }

}
