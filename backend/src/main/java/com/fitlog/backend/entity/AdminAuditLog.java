package com.fitlog.backend.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="admin_audit_logs")
public class AdminAuditLog {
 @Id public String id=UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="actor_id") public User actor;
 @Column(name="action",nullable=false,length=40) public String action;
 @Column(name="target_id",length=36) public String targetId;
 @Column(name="created_at",nullable=false) public Instant createdAt=Instant.now();
}
