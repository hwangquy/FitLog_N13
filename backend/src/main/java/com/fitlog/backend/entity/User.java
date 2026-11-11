package com.fitlog.backend.entity;
import jakarta.persistence.*;
import java.util.UUID;
import java.time.*;

@Entity @Table(name="users")
public class User {
 @Id public String id = UUID.randomUUID().toString();
 @Column(nullable=false,length=100) public String name;
 @Column(nullable=false,unique=true,length=254) public String email;
 @Column(name="password_hash",nullable=false,length=100) public String passwordHash;
 @Column(nullable=false,length=20) public String role = "USER";
 @Column(nullable=false) public boolean enabled = true;
 @Column(name="analytics_enabled",nullable=false) public boolean analyticsEnabled = false;
 @Column(name="created_at",nullable=false) public Instant createdAt = Instant.now();
}
