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
import java.util.*;

@RestController @RequestMapping("/api/goals")
public class GoalController {
 private final GoalRepository goals;private final UserRepository users;
 public GoalController(GoalRepository goals,UserRepository users){this.goals=goals;this.users=users;}
 @GetMapping @Transactional(readOnly=true)
 public List<GoalView> all(Authentication a){return goals.findByUserIdOrderByCreatedAtAsc(CurrentUser.from(a).id()).stream().map(GoalView::of).toList();}
 private Goal owned(String id,Authentication a){return goals.findByIdAndUserId(id,CurrentUser.from(a).id()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
 private void apply(Goal g,GoalInput r){
  if(!Set.of("sessions","minutes","distance","calories").contains(r.metric())|| !Set.of("week","month").contains(r.period()) || !Set.of("Chạy bộ","Gym","Đạp xe","Đi bộ","Yoga","Khác","all").contains(r.workoutType())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mục tiêu không hợp lệ.");
  g.title=r.title().trim();g.metric=r.metric();g.target=r.target();g.period=r.period();g.workoutType=r.workoutType();
 }
 @PostMapping @ResponseStatus(HttpStatus.CREATED) @Transactional
 public GoalView create(@Valid @RequestBody GoalInput r,Authentication a){Goal g=new Goal();g.user=users.getReferenceById(CurrentUser.from(a).id());apply(g,r);return GoalView.of(goals.save(g));}
 @PutMapping("/{id}") @Transactional
 public GoalView update(@PathVariable String id,@Valid @RequestBody GoalInput r,Authentication a){Goal g=owned(id,a);apply(g,r);return GoalView.of(goals.save(g));}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
 public void remove(@PathVariable String id,Authentication a){goals.delete(owned(id,a));}
}
