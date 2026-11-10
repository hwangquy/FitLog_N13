package com.fitlog.backend.entity;
import jakarta.persistence.*;
import java.util.UUID;
import java.time.*;

@Entity @Table(name="workouts")
public class Workout {
 @Id public String id = UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") public User user;
 @Column(nullable=false,length=80) public String title;
 @Column(nullable=false,length=40) public String type;
 @Column(nullable=false) public LocalDate date;
 @Column(nullable=false) public int duration;
 @Column(nullable=false) public double distance;
 public Integer calories;
 @Column(length=500) public String note;
 @Column(length=120) public String location;
 public Double latitude;
 public Double longitude;
 @Lob @Column(name="route_points",columnDefinition="LONGTEXT") public String routePoints;
 @Column(length=120) public String image;
 @Column(name="created_at",nullable=false) public Instant createdAt=Instant.now();
}
