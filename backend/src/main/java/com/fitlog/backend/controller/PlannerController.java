package com.fitlog.backend.controller;
import com.fitlog.backend.dto.ApiDtos.*;
import com.fitlog.backend.entity.*;
import com.fitlog.backend.repository.*;
import com.fitlog.backend.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

@RestController @RequestMapping("/api/plans")
public class PlannerController {
 private final WorkoutPlanRepository plans; private final WorkoutRepository workouts; private final UserRepository users;
 public PlannerController(WorkoutPlanRepository plans,WorkoutRepository workouts,UserRepository users) {this.plans=plans;this.workouts=workouts;this.users=users;}
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
