package com.fitlog.backend.entity;
import jakarta.persistence.*;
import java.util.UUID;
import java.time.*;

@Entity @Table(name="media_files")
public class MediaFile {
 @Id public String id=UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") public User user;
 @Column(nullable=false,length=100) public String filename;
 @Column(name="content_type",nullable=false,length=32) public String contentType;
 @Column(name="created_at",nullable=false) public Instant createdAt=Instant.now();
}
