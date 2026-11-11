package com.fitlog.backend.controller;
import com.fitlog.backend.dto.ApiDtos.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitlog.backend.entity.*;
import com.fitlog.backend.repository.*;
import com.fitlog.backend.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

@RestController @RequestMapping("/api/workouts")
public class WorkoutController {
 private final WorkoutRepository workouts; private final UserRepository users; private final MediaFileRepository media;
 private final ObjectMapper mapper;
 public WorkoutController(WorkoutRepository workouts,UserRepository users,MediaFileRepository media,ObjectMapper mapper){this.workouts=workouts;this.users=users;this.media=media;this.mapper=mapper;}
 @GetMapping @Transactional(readOnly=true)
 public ResponseEntity<List<WorkoutView>> list(Authentication a,
   @RequestParam(name="_page",required=false) Integer page,
   @RequestParam(name="_limit",defaultValue="10") int limit,
   @RequestParam(required=false) String q,@RequestParam(required=false) String type) {
  String uid=CurrentUser.from(a).id();
  if(page==null) return ResponseEntity.ok(workouts.findByUserIdOrderByDateDescCreatedAtDesc(uid).stream().map(WorkoutView::of).toList());
  if(page<1||limit<1||limit>100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Phân trang không hợp lệ.");
  Page<Workout> result=workouts.search(uid,q==null||q.isBlank()?null:q.trim(),type==null||type.isBlank()?null:type,PageRequest.of(page-1,limit,Sort.by(Sort.Order.desc("date"),Sort.Order.desc("createdAt"))));
  return ResponseEntity.ok().header("X-Total-Count",String.valueOf(result.getTotalElements())).body(result.stream().map(WorkoutView::of).toList());
 }
 @GetMapping("/{id}") @Transactional(readOnly=true)
 public WorkoutView get(@PathVariable String id,Authentication a){return WorkoutView.of(owned(id,a));}
 private Workout owned(String id,Authentication a){return workouts.findByIdAndUserId(id,CurrentUser.from(a).id()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy buổi tập."));}
 private void apply(Workout w,WorkoutInput r,Authentication a){
  if(!Set.of("Chạy bộ","Gym","Đạp xe","Đi bộ","Yoga","Khác").contains(r.type())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Loại hoạt động không hợp lệ.");
  if(r.date().isAfter(LocalDate.now().plusDays(1))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ngày tập chưa hợp lệ.");
  if(r.image()!=null && !r.image().isBlank()) {
   String path=r.image();
   if(!path.startsWith("/media/")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ảnh phải được tải lên FitLog trước khi lưu.");
   String imageId=path.substring("/media/".length());
   if(media.findByIdAndUserId(imageId,CurrentUser.from(a).id()).isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ảnh không thuộc tài khoản.");
   w.image=path;
  } else w.image=null;
  w.title=r.title().trim();w.type=r.type();w.date=r.date();w.duration=r.duration();w.distance=r.distance();
  w.calories=r.calories();w.note=r.note();w.location=r.location();
  w.latitude=r.coords()==null?null:r.coords().latitude();
  w.longitude=r.coords()==null?null:r.coords().longitude();
  try { w.routePoints=r.route()==null||r.route().isEmpty()?null:mapper.writeValueAsString(r.route()); }
  catch(Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Dữ liệu tuyến đường không hợp lệ."); }
 }
 @PostMapping @ResponseStatus(HttpStatus.CREATED) @Transactional
 public WorkoutView create(@Valid @RequestBody WorkoutInput r,Authentication a){
  Workout w=new Workout();w.user=users.getReferenceById(CurrentUser.from(a).id());
  apply(w,r,a);return WorkoutView.of(workouts.save(w));
 }
 @PutMapping("/{id}") @Transactional
 public WorkoutView update(@PathVariable String id,@Valid @RequestBody WorkoutInput r,Authentication a){
  Workout w=owned(id,a);apply(w,r,a);return WorkoutView.of(workouts.save(w));
 }
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
 public void remove(@PathVariable String id,Authentication a){workouts.delete(owned(id,a));}
}
