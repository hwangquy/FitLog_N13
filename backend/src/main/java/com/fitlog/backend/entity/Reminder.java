package com.fitlog.backend.entity;
import jakarta.persistence.*;
import java.util.UUID;
import java.time.*;

@Entity @Table(name="reminders")
public class Reminder {
 @Id public String id=UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") public User user;
 @Column(nullable=false,length=100) public String title;
 @Column(nullable=false,columnDefinition="CHAR(5)") public String time;
 @Column(nullable=false,length=30) public String days;
 @Column(nullable=false) public boolean enabled=true;
 @Column(name="created_at",nullable=false) public Instant createdAt=Instant.now();
}
