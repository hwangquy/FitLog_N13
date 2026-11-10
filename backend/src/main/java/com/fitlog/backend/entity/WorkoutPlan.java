package com.fitlog.backend.entity;
import jakarta.persistence.*;
import java.util.UUID;
import java.time.*;

@Entity @Table(name="workout_plans")
public class WorkoutPlan {
 @Id public String id=UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") public User user;
 @Column(nullable=false) public LocalDate date;
 @Column(nullable=false,length=100) public String title;
 @Column(nullable=false,length=40) public String type;
 @Column(nullable=false) public int minutes;
 @Column(nullable=false,length=20) public String intensity="nhẹ";
 @Column(length=500) public String note;
 @Column(nullable=false,length=20) public String status="PLANNED";
 @Column(name="completed_workout_id",length=36) public String completedWorkoutId;
 @Column(name="created_at",nullable=false) public Instant createdAt=Instant.now();
}
