package com.fitlog.backend.controller;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fitlog.backend.entity.User;
import com.fitlog.backend.entity.UserActivityEvent;
import com.fitlog.backend.repository.UserActivityRepository;
import com.fitlog.backend.repository.UserRepository;
import com.fitlog.backend.security.CurrentUser;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController @RequestMapping("/api/tracking")
public class TrackingController {
 private final UserRepository users;
 private final UserActivityRepository events;
 private static final Set<String> TYPES=Set.of("screen_view","workout_created","goal_created","planner_opened","coach_opened");
 private static final Set<String> SCREENS=Set.of("home","workouts","progress","coach","profile","planner","goals","reminders","workout_detail","other");
 public TrackingController(UserRepository users,UserActivityRepository events){this.users=users;this.events=events;}
 public record Consent(boolean enabled) {}
 public record EventRequest(@NotBlank String type,@NotBlank String screen) {}
 
@GetMapping("/consent")
public Consent consent(Authentication a) {

    System.out.println("[TRACKING] GET consent duoc goi");

    if (a == null || !a.isAuthenticated()) {
        System.out.println("[TRACKING] Chua xac thuc");
        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Chua dang nhap"
        );
    }

    String uid = CurrentUser.from(a).id();

    System.out.println("[TRACKING] Authentication hop le");

    Optional<User> found = users.findById(uid);

    System.out.println(
            "[TRACKING] Tim thay user: " + found.isPresent()
    );

    User user = found.orElseThrow(() ->
            new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Khong tim thay tai khoan"
            )
    );

    return new Consent(user.analyticsEnabled);
}

 @PutMapping("/consent") @Transactional public Consent consent(@RequestBody Consent c,Authentication a){
  User user=users.findById(CurrentUser.from(a).id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  user.analyticsEnabled=c.enabled();users.save(user);
  if(!c.enabled()) {
   // Previously collected identifiable events are erased when consent is withdrawn.
   // Admin dashboards retain only currently stored opt-in events.
   events.deleteByOwner(user.id);
  }
  return new Consent(user.analyticsEnabled);
 }
 @PostMapping("/events") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
 public void record(@Valid @RequestBody EventRequest r,Authentication a){
  if(!TYPES.contains(r.type())||!SCREENS.contains(r.screen()))
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Loại sự kiện không hợp lệ.");
  User user=users.findById(CurrentUser.from(a).id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  if(!user.analyticsEnabled) return;
  if(events.countByUserIdAndCreatedAtAfter(user.id,Instant.now().minusSeconds(60))>=30)
    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Quá nhiều sự kiện tracking.");
  UserActivityEvent e=new UserActivityEvent();e.user=user;e.eventType=r.type();e.screenName=r.screen();events.save(e);
 }
}
