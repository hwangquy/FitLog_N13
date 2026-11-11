package com.fitlog.backend.dto;
import com.fitlog.backend.entity.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.time.*;

/** Request DTOs never accept an owner ID. The server gets identity from Spring Security. */
public final class ApiDtos {
 private ApiDtos() {}
 public record PublicUser(String id,String name,String email,String role) {
  public static PublicUser of(User u) { return new PublicUser(u.id,u.name,u.email,u.role.toLowerCase()); }
 }
 public record RegisterRequest(@NotBlank @Size(min=2,max=100) String name,
    @NotBlank @Email @Size(max=254) String email,
    @NotBlank @Size(min=10,max=72) String password) {}
 public record LoginRequest(@NotBlank String email,@NotBlank String password) {}
 public record AuthResponse(String accessToken,String tokenType,PublicUser user) {}
 public record Coords(@NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
                      @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude) {}
 public record WorkoutInput(@NotBlank @Size(max=80) String title,@NotBlank String type,
    @NotNull LocalDate date,@NotNull @Min(1) @Max(1440) Integer duration,
    @NotNull @DecimalMin("0.0") @DecimalMax("10000.0") Double distance,
    @Min(0) @Max(10000) Integer calories,@Size(max=500) String note,
    @Size(max=120) String location,@Valid Coords coords,
    @Size(max=1000) List<@Valid Coords> route, String image,Instant createdAt) {}
 public record WorkoutView(String id,String title,String type,LocalDate date,int duration,double distance,
    Integer calories,String note,String location,Coords coords,List<Coords> route,String image,Instant createdAt) {
   private static final ObjectMapper JSON = new ObjectMapper();
  public static WorkoutView of(Workout w) {
    List<Coords> route=List.of();
    if(w.routePoints!=null&&!w.routePoints.isBlank()) {
      try { route=JSON.readValue(w.routePoints,new TypeReference<List<Coords>>(){}); }
      catch(Exception ignored) { route=List.of(); }
    }
    return new WorkoutView(w.id,w.title,w.type,w.date,w.duration,w.distance,w.calories,w.note,w.location,
       w.latitude==null||w.longitude==null?null:new Coords(w.latitude,w.longitude),route,w.image,w.createdAt);
   }
 }
 public record GoalInput(@NotBlank @Size(max=100) String title,@NotBlank String metric,
    @NotNull @DecimalMin("0.01") @DecimalMax("1000000") Double target,
    @NotBlank String period,@NotBlank String workoutType,Instant createdAt) {}
 public record GoalView(String id,String title,String metric,double target,String period,String workoutType,Instant createdAt) {
  public static GoalView of(Goal g) { return new GoalView(g.id,g.title,g.metric,g.target,g.period,g.workoutType,g.createdAt); }
 }
 public record ReminderInput(@NotBlank @Size(max=100) String title,@NotBlank String time,
    @NotEmpty List<Integer> days,boolean enabled, Instant createdAt) {}
 public record ReminderView(String id,String title,String time,List<Integer> days,boolean enabled,Instant createdAt) {
  public static ReminderView of(Reminder r) {
   return new ReminderView(r.id,r.title,r.time,Arrays.stream(r.days.split(",")).map(Integer::parseInt).toList(),r.enabled,r.createdAt);
  }
 }
 public record ToggleRequest(boolean enabled) {}
 public record PlanInput(@NotNull LocalDate date,@NotBlank @Size(max=100) String title,
    @NotBlank String type,@NotNull @Min(5) @Max(180) Integer minutes,
    @NotBlank String intensity,@Size(max=500) String note) {}
 public record PlanView(String id,LocalDate date,String title,String type,int minutes,
    String intensity,String note,String status,String completedWorkoutId,Instant createdAt) {
   public static PlanView of(WorkoutPlan p) {
    return new PlanView(p.id,p.date,p.title,p.type,p.minutes,p.intensity,p.note,p.status,p.completedWorkoutId,p.createdAt);
   }
 }
}
