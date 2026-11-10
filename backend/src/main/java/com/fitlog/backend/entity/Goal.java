package com.fitlog.backend.entity;
import jakarta.persistence.*;
import java.util.UUID;
import java.time.*;

@Entity @Table(name="goals")
public class Goal {
 @Id public String id=UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") public User user;
 @Column(nullable=false,length=100) public String title;
 @Column(nullable=false,length=20) public String metric;
 @Column(nullable=false) public double target;
 @Column(nullable=false,length=20) public String period;
 @Column(name="workout_type",nullable=false,length=40) public String workoutType;
 @Column(name="created_at",nullable=false) public Instant createdAt=Instant.now();
}
