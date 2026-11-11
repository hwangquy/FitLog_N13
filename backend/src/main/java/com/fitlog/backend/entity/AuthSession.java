package com.fitlog.backend.entity;
import jakarta.persistence.*;
import java.util.UUID;
import java.time.*;

@Entity @Table(name="auth_sessions")
public class AuthSession {
 @Id public String id = UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") public User user;
 @Column(name="token_hash",nullable=false,unique=true,columnDefinition="CHAR(64)") public String tokenHash;
 @Column(name="expires_at",nullable=false) public Instant expiresAt;
 @Column(name="revoked_at") public Instant revokedAt;
}
