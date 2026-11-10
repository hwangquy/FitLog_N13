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
import java.util.stream.Collectors;

@RestController @RequestMapping("/api/reminders")
public class ReminderController {
 private final ReminderRepository reminders;private final UserRepository users;
 public ReminderController(ReminderRepository reminders,UserRepository users){this.reminders=reminders;this.users=users;}
 @GetMapping @Transactional(readOnly=true)
 public List<ReminderView> all(Authentication a){return reminders.findByUserIdOrderByTimeAsc(CurrentUser.from(a).id()).stream().map(ReminderView::of).toList();}
 private Reminder owned(String id,Authentication a){return reminders.findByIdAndUserId(id,CurrentUser.from(a).id()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
 private void apply(Reminder t,ReminderInput r){
  if(!r.time().matches("(?:[01]\\d|2[0-3]):[0-5]\\d") || r.days().stream().anyMatch(d->d==null||d<0||d>6)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Thời gian nhắc nhở không hợp lệ.");
  t.title=r.title().trim();t.time=r.time();t.days=r.days().stream().distinct().sorted().map(String::valueOf).collect(Collectors.joining(","));t.enabled=r.enabled();
 }
 @PostMapping @ResponseStatus(HttpStatus.CREATED) @Transactional
 public ReminderView create(@Valid @RequestBody ReminderInput r,Authentication a){Reminder t=new Reminder();t.user=users.getReferenceById(CurrentUser.from(a).id());apply(t,r);return ReminderView.of(reminders.save(t));}
 @PutMapping("/{id}") @Transactional
 public ReminderView update(@PathVariable String id,@Valid @RequestBody ReminderInput r,Authentication a){Reminder t=owned(id,a);apply(t,r);return ReminderView.of(reminders.save(t));}
 @PatchMapping("/{id}") @Transactional
 public ReminderView enabled(@PathVariable String id,@RequestBody ToggleRequest r,Authentication a){Reminder t=owned(id,a);t.enabled=r.enabled();return ReminderView.of(reminders.save(t));}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
 public void remove(@PathVariable String id,Authentication a){reminders.delete(owned(id,a));}
}
