package com.fitlog.backend.controller;
import com.fitlog.backend.dto.ApiDtos.*;
import com.fitlog.backend.entity.*;
import com.fitlog.backend.repository.*;
import com.fitlog.backend.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

@RestController @RequestMapping("/api/plans")
public class PlannerController {
 private final WorkoutPlanRepository plans; private final WorkoutRepository workouts; private final UserRepository users; private final JdbcTemplate db; private final com.fitlog.backend.service.PlanBatchService batchService;
 public PlannerController(WorkoutPlanRepository plans,WorkoutRepository workouts,UserRepository users,JdbcTemplate db,com.fitlog.backend.service.PlanBatchService batchService) {this.plans=plans;this.workouts=workouts;this.users=users;this.db=db;this.batchService=batchService;}
 private WorkoutPlan owned(String id,Authentication a) {return plans.findByIdAndUserId(id,CurrentUser.from(a).id()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
 @GetMapping @Transactional(readOnly=true)
 public List<PlanView> list(@RequestParam LocalDate from,@RequestParam LocalDate to,Authentication a) {
  if(to.isBefore(from)||to.isAfter(from.plusDays(62))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Khoảng lịch tối đa 63 ngày.");
  return plans.findByUserIdAndDateBetweenOrderByDateAsc(CurrentUser.from(a).id(),from,to).stream().map(PlanView::of).toList();
 }
 private void apply(WorkoutPlan p,PlanInput input) {
  if(!Set.of("Chạy bộ","Gym","Đạp xe","Đi bộ","Yoga","Khác").contains(input.type()) || !Set.of("nhẹ","vừa").contains(input.intensity())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Lịch tập không hợp lệ.");
  p.date=input.date();p.title=input.title().trim();p.type=input.type();p.minutes=input.minutes();p.intensity=input.intensity();p.note=input.note();
 }
 @PostMapping @ResponseStatus(HttpStatus.CREATED) @Transactional
 public PlanView add(@Valid @RequestBody PlanInput input,Authentication a){WorkoutPlan p=new WorkoutPlan();p.user=users.getReferenceById(CurrentUser.from(a).id());apply(p,input);return PlanView.of(plans.save(p));}
 // Luu hang loat trong mot transaction: loi mot buoi -> rollback tat ca.
 @PostMapping("/batch") @ResponseStatus(HttpStatus.CREATED) @Transactional
 public List<PlanView> batch(@Valid @RequestBody List<@Valid PlanInput> inputs,Authentication a){
  if(inputs==null||inputs.isEmpty()||inputs.size()>5)
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Chỉ lưu 1-5 buổi một lần.");
  String uid=CurrentUser.from(a).id();
  // Lock per user to prevent concurrent duplicate batch confirmations.
  db.queryForObject("SELECT id FROM users WHERE id=? FOR UPDATE",String.class,uid);
  List<LocalDate> dates=new ArrayList<>();
  List<PlanView> out=new ArrayList<>();
  for(PlanInput i:inputs){
   if(i.date().isBefore(LocalDate.now())||i.date().isAfter(LocalDate.now().plusDays(28))||dates.contains(i.date()))
    throw new ResponseStatusException(HttpStatus.CONFLICT,"Ngày lịch trùng hoặc ngoài khoảng 28 ngày.");
   dates.add(i.date());
   Integer existing=db.queryForObject("SELECT COUNT(*) FROM workout_plans WHERE user_id=? AND date=? AND status='PLANNED'",Integer.class,uid,i.date());
   if(existing!=null&&existing>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Đã có lịch vào ngày "+i.date());
   WorkoutPlan p=new WorkoutPlan();p.user=users.getReferenceById(uid);apply(p,i);
   out.add(PlanView.of(plans.save(p)));
  }
  return out;
 }
 // Kiểm tra xung đột, không ghi dữ liệu.
 @PostMapping("/batch/preview")
 public com.fitlog.backend.service.PlanBatchService.Preview previewBatch(
     @Valid @RequestBody List<@Valid PlanInput> inputs,Authentication a){
  return batchService.preview(CurrentUser.from(a).id(),inputs);
 }
 // Áp dụng giữ / thay / đổi ngày trong một transaction.
 @PostMapping("/batch/resolve")
 public com.fitlog.backend.service.PlanBatchService.Result resolveBatch(
     @Valid @RequestBody com.fitlog.backend.service.PlanBatchService.ResolveRequest input,Authentication a){
  return batchService.resolve(CurrentUser.from(a).id(),input.choices());
 }
 @PutMapping("/{id}") @Transactional
 public PlanView edit(@PathVariable String id,@Valid @RequestBody PlanInput input,Authentication a){WorkoutPlan p=owned(id,a);if(!p.status.equals("PLANNED")) throw new ResponseStatusException(HttpStatus.CONFLICT,"Không chỉnh sửa buổi đã hoàn thành.");apply(p,input);return PlanView.of(plans.save(p));}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
 public void remove(@PathVariable String id,Authentication a){plans.delete(owned(id,a));}
 @PostMapping("/{id}/complete") @Transactional
 public PlanView complete(@PathVariable String id,Authentication a){
  WorkoutPlan p=owned(id,a);
  if(p.status.equals("COMPLETED")) return PlanView.of(p); // idempotent, never double-count
  Workout w=new Workout();w.user=users.getReferenceById(CurrentUser.from(a).id());
  w.title=p.title;w.type=p.type;w.date=p.date.isAfter(LocalDate.now())?LocalDate.now():p.date;
  w.duration=p.minutes;w.distance=0;w.note="Hoàn thành từ lịch tập" + (p.note==null?"":" · "+p.note);
  workouts.save(w);p.completedWorkoutId=w.id;p.status="COMPLETED";
  return PlanView.of(plans.save(p));
 }
 @PostMapping("/{id}/skip") @Transactional
 public PlanView skip(@PathVariable String id,Authentication a){
  WorkoutPlan p=owned(id,a);if(p.status.equals("COMPLETED")) throw new ResponseStatusException(HttpStatus.CONFLICT,"Buổi tập đã hoàn thành.");
  p.status="SKIPPED";return PlanView.of(plans.save(p));
 }
}
