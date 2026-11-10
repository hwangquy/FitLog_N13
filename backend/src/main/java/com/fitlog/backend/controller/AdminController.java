package com.fitlog.backend.controller;
import com.fitlog.backend.entity.*;
import com.fitlog.backend.repository.*;
import com.fitlog.backend.security.CurrentUser;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
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
  data.put("totalGoals",goals.count());data.put("totalReminders",reminders.count());data.put("totalPlans",plans.count());
  data.put("trackingOptIn",count("select count(*) from users where analytics_enabled=1"));
  data.put("pageViews7d",count("select count(*) from user_activity_events where event_type='screen_view' and created_at>=?",java.sql.Timestamp.from(week)));
  data.put("activeTrackedUsers7d",count("select count(distinct user_id) from user_activity_events where created_at>=?",java.sql.Timestamp.from(week)));
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
 public record SetEnabled(boolean enabled) {}
 @PatchMapping("/users/{id}/enabled") @Transactional
 public UserRow setEnabled(@PathVariable String id,@RequestBody SetEnabled request,Authentication auth){
  String actorId=CurrentUser.from(auth).id();
  User target=users.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
  if(actorId.equals(id)&&!request.enabled())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Không thể khóa chính mình.");
  if(target.role.equals("ADMIN")&&!request.enabled())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Không cho phép khóa tài khoản ADMIN ở giao diện.");
  target.enabled=request.enabled();users.save(target);
  AdminAuditLog log=new AdminAuditLog();log.actor=users.getReferenceById(actorId);
  log.action=request.enabled()?"ENABLE_USER":"DISABLE_USER";log.targetId=id;audits.save(log);
  return UserRow.of(target,workouts.countByUserId(target.id));
 }
 @GetMapping("/tracking") public Map<String,Object> tracking(@RequestParam(defaultValue="7") int days){
  if(days<1||days>90)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"days phải từ 1 đến 90");
  Instant since=Instant.now().minus(Duration.ofDays(days));
  return Map.of(
   "totalEvents",count("select count(*) from user_activity_events where created_at>=?",java.sql.Timestamp.from(since)),
   "uniqueUsers",count("select count(distinct user_id) from user_activity_events where created_at>=?",java.sql.Timestamp.from(since)),
   "screens",rows("select screen_name as label,count(*) as count from user_activity_events where created_at>=? and event_type='screen_view' group by screen_name order by count desc",java.sql.Timestamp.from(since)),
   "events",rows("select event_type as label,count(*) as count from user_activity_events where created_at>=? group by event_type order by count desc",java.sql.Timestamp.from(since)),
   "daily",rows("select date(created_at) as day,count(*) as count from user_activity_events where created_at>=? group by date(created_at) order by day",java.sql.Timestamp.from(since))
  );
 }
 public record AuditRow(String action,String targetId,Instant createdAt) {}
 @GetMapping("/audit") public Map<String,Object> audit(@RequestParam(defaultValue="0") int page){
  if(page<0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  Page<AdminAuditLog> result=audits.findAllByOrderByCreatedAtDesc(PageRequest.of(page,20));
  return Map.of("items",result.getContent().stream().map(a->new AuditRow(a.action,a.targetId,a.createdAt)).toList(),
     "page",page,"total",result.getTotalElements());
 }
}
