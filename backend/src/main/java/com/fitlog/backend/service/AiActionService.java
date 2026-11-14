package com.fitlog.backend.service;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

@Service
public class AiActionService {
 private final JdbcTemplate db;private final ObjectMapper json;private final PlanBatchService planBatch;
 private static final Set<String> TYPES=Set.of("Gym","Yoga","Chạy bộ","Đi bộ","Đạp xe","Khác");
 public AiActionService(JdbcTemplate db,ObjectMapper json,PlanBatchService planBatch){this.db=db;this.json=json;this.planBatch=planBatch;}
 public record Prepared(String type,ObjectNode payload){}
 private ResponseStatusException bad(){return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Đề xuất AI không hợp lệ.");}
 private String str(JsonNode n,String k,int max){
  String x=n.path(k).asText("").trim();if(x.isEmpty()||x.length()>max)throw bad();return x;
 }
 private LocalDate day(JsonNode n,String field,int earliest,int latest){
  try {
   LocalDate d=LocalDate.parse(str(n,field,10));
   if(d.isBefore(LocalDate.now().plusDays(earliest))||d.isAfter(LocalDate.now().plusDays(latest)))throw bad();
   return d;
  }catch(java.time.format.DateTimeParseException e){throw bad();}
 }
 private String workoutType(JsonNode n){String type=str(n,"type",40);if(!TYPES.contains(type))throw bad();return type;}
 private int minutes(JsonNode n){int m=n.path("minutes").asInt(-1);if(m<15||m>90)throw bad();return m;}
 public Prepared prepare(JsonNode suggestion){
  if(suggestion==null||!suggestion.isObject())return null;
  String type=suggestion.path("type").asText("NONE");
  ObjectNode p=json.createObjectNode();
  switch(type){
   case "CREATE_PLAN" -> {
    JsonNode raw=suggestion.path("items");if(!raw.isArray()||raw.isEmpty()||raw.size()>5)throw bad();
    ArrayNode items=p.putArray("items");
    for(JsonNode i:raw){
     ObjectNode o=items.addObject();o.put("date",day(i,"date",0,28).toString());
     o.put("title",str(i,"title",100));o.put("type",workoutType(i));o.put("minutes",minutes(i));
     String intensity=i.path("intensity").asText("nhẹ");if(!Set.of("nhẹ","vừa").contains(intensity))throw bad();
     o.put("intensity",intensity);o.put("note",i.path("note").asText("").substring(0,Math.min(500,i.path("note").asText("").length())));
    }
   }
   case "RESCHEDULE" -> {p.put("planId",str(suggestion,"planId",36));p.put("date",day(suggestion,"date",0,28).toString());}
   case "SKIP_PLAN" -> p.put("planId",str(suggestion,"planId",36));
   case "LOG_WORKOUT" -> {
    p.put("title",str(suggestion,"title",80));p.put("type",workoutType(suggestion));
    p.put("date",day(suggestion,"date",-30,0).toString());p.put("minutes",minutes(suggestion));
    double km=suggestion.path("distanceKm").asDouble(0);if(!Double.isFinite(km)||km<0||km>10000)throw bad();
    p.put("distanceKm",km);p.put("note",suggestion.path("note").asText("").substring(0,Math.min(500,suggestion.path("note").asText("").length())));
   }
   default -> {return null;}
  }
  p.put("type",type);
  return new Prepared(type,p);
 }
 private record Pending(String type,String payload,String status,String sessionId,LocalDateTime createdAt){}
 @Transactional
 public ObjectNode apply(String uid,String id,PlanBatchService.ChatDecisions decisions){
  // Khóa người dùng để tránh 2 lần xác nhận cùng lúc tạo lịch chồng chéo.
  db.queryForObject("SELECT id FROM users WHERE id=? FOR UPDATE",String.class,uid);
  Pending pending=db.query("SELECT action_type,payload,status,session_id,created_at FROM ai_actions WHERE id=? AND user_id=? FOR UPDATE",rs->
   rs.next()?new Pending(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getTimestamp(5).toLocalDateTime()):null,id,uid);
  if(pending==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Không thấy thao tác AI.");
  if(!"PENDING".equals(pending.status))throw new ResponseStatusException(HttpStatus.CONFLICT,"Thao tác đã được xử lý.");
  if(pending.createdAt.isBefore(LocalDateTime.now(java.time.ZoneOffset.UTC).minusHours(24)))
   throw new ResponseStatusException(HttpStatus.CONFLICT,"Đề xuất đã quá hạn 24 giờ.");
  try{
   Prepared a=prepare(json.readTree(pending.payload)); // payload đã chuẩn hóa nhưng cần định dạng type
   if(a==null)throw bad();
   switch(a.type){
    case "CREATE_PLAN" -> createPlansWithChoices(uid,a.payload.path("items"),decisions);
    case "RESCHEDULE" -> { rejectChoices(decisions); reschedule(uid,a.payload); }
    case "SKIP_PLAN" -> { rejectChoices(decisions); skip(uid,a.payload.path("planId").asText()); }
    case "LOG_WORKOUT" -> { rejectChoices(decisions); logWorkout(uid,a.payload); }
    default -> throw bad();
   }
   db.update("UPDATE ai_actions SET status='APPLIED',applied_at=UTC_TIMESTAMP(6) WHERE id=? AND user_id=?",id,uid);
   String message="Đã xác nhận thao tác "+a.type+" và lưu dữ liệu vào FitLog.";
   db.update("INSERT INTO ai_chat_messages(id,session_id,user_id,role,content) VALUES(?,?,?,?,?)",UUID.randomUUID().toString(),pending.sessionId,uid,"assistant",message);
   ObjectNode out=json.createObjectNode();out.put("status","APPLIED");out.put("message",message);return out;
  }catch(ResponseStatusException e){throw e;}
   catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Không áp dụng được đề xuất AI.",e);}
 }
 private void rejectChoices(PlanBatchService.ChatDecisions choices){
  if(choices!=null&&choices.choices()!=null&&!choices.choices().isEmpty())throw bad();
 }
 private void createPlansWithChoices(String uid,JsonNode items,PlanBatchService.ChatDecisions decisions){
  if(decisions==null||decisions.choices()==null){createPlans(uid,items);return;}
  if(decisions.choices().size()!=items.size())throw bad();
  List<PlanBatchService.Choice> rows=new ArrayList<>();
  for(int index=0;index<items.size();index++){
   JsonNode original=items.get(index);
   PlanBatchService.ChatChoice choice=decisions.choices().get(index);
   if(choice==null||choice.date()==null||choice.decision()==null)throw bad();
   LocalDate newDay;
   try{newDay=LocalDate.parse(choice.date());}catch(Exception e){throw bad();}
   // Other fields ALWAYS come from the persisted, server-validated AI action.
   rows.add(new PlanBatchService.Choice(new com.fitlog.backend.dto.ApiDtos.PlanInput(
    newDay,original.path("title").asText(),original.path("type").asText(),
    original.path("minutes").asInt(),original.path("intensity").asText(),original.path("note").asText()),
    choice.decision(),choice.expectedExistingId()));
  }
  planBatch.resolve(uid,rows);
 }
 private void createPlans(String uid,JsonNode items){
  Set<LocalDate> seen=new HashSet<>();
  for(JsonNode p:items){
   LocalDate date=LocalDate.parse(p.path("date").asText());
   if(!seen.add(date))throw new ResponseStatusException(HttpStatus.CONFLICT,"AI lên 2 buổi cùng một ngày.");
   Integer count=db.queryForObject("SELECT COUNT(*) FROM workout_plans WHERE user_id=? AND date=? AND status='PLANNED'",Integer.class,uid,date);
   if(count!=null&&count>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Đã có lịch trong ngày "+date);
   db.update("INSERT INTO workout_plans(id,user_id,date,title,type,minutes,intensity,note,status,created_at) VALUES(?,?,?,?,?,?,?,?, 'PLANNED',UTC_TIMESTAMP(6))",
    UUID.randomUUID().toString(),uid,date,p.path("title").asText(),p.path("type").asText(),p.path("minutes").asInt(),p.path("intensity").asText(),p.path("note").asText());
  }
 }
 private void reschedule(String uid,JsonNode p){
  String id=p.path("planId").asText();LocalDate day=LocalDate.parse(p.path("date").asText());
  Integer exists=db.queryForObject("SELECT COUNT(*) FROM workout_plans WHERE id=? AND user_id=? AND status='PLANNED'",Integer.class,id,uid);
  if(exists==null||exists==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Lịch không thuộc bạn hoặc đã hoàn thành.");
  Integer conflict=db.queryForObject("SELECT COUNT(*) FROM workout_plans WHERE user_id=? AND date=? AND id<>? AND status='PLANNED'",Integer.class,uid,day,id);
  if(conflict!=null&&conflict>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Ngày mới đã có lịch tập.");
  db.update("UPDATE workout_plans SET date=? WHERE id=? AND user_id=? AND status='PLANNED'",day,id,uid);
 }
 private void skip(String uid,String id){
  int n=db.update("UPDATE workout_plans SET status='SKIPPED' WHERE id=? AND user_id=? AND status='PLANNED'",id,uid);
  if(n!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"Không thể bỏ lịch này.");
 }
 private void logWorkout(String uid,JsonNode p){
  db.update("INSERT INTO workouts(id,user_id,title,type,date,duration,distance,note,created_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
   UUID.randomUUID().toString(),uid,p.path("title").asText(),p.path("type").asText(),LocalDate.parse(p.path("date").asText()),
   p.path("minutes").asInt(),p.path("distanceKm").asDouble(),p.path("note").asText());
 }
}
