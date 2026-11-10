package com.fitlog.backend.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="user_activity_events")
public class UserActivityEvent {
 @Id public String id=UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") public User user;
 @Column(name="event_type",nullable=false,length=40) public String eventType;
 @Column(name="screen_name",nullable=false,length=40) public String screenName;
 @Column(name="created_at",nullable=false) public Instant createdAt=Instant.now();
}
