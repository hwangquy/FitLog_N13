-- FITLOG FULLSTACK ADMIN UPDATED - MARiADB WINDOWS (NO DOCKER)
-- Built from the exact V1, V2, V3 SQL migrations bundled with FitLog_FullStack_Admin_Updated.zip.
-- Use in HeidiSQL connected to LOCAL WINDOWS MARIADB (typically 127.0.0.1:3306).
-- IMPORTANT: Intended for a NEW EMPTY fitlog_db. Back up old data first.
-- DO NOT run against a populated fitlog_db or existing Flyway-managed database.
-- This script does not create any demo login/account; register through the application.
-- When manually applying this script, set spring.flyway.enabled=false in application.yml.

CREATE DATABASE IF NOT EXISTS `fitlog_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `fitlog_db`;

-- ---------- Section 1: V1__schema.sql ----------
CREATE TABLE users (
 id VARCHAR(36) PRIMARY KEY, name VARCHAR(100) NOT NULL,
 email VARCHAR(254) NOT NULL UNIQUE, password_hash VARCHAR(100) NOT NULL,
 role VARCHAR(20) NOT NULL DEFAULT 'USER', created_at DATETIME(6) NOT NULL
);
CREATE TABLE auth_sessions (
 id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
 token_hash CHAR(64) NOT NULL UNIQUE, expires_at DATETIME(6) NOT NULL,
 revoked_at DATETIME(6) NULL,
 CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX ix_session_user ON auth_sessions(user_id);
CREATE TABLE workouts (
 id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
 title VARCHAR(80) NOT NULL, type VARCHAR(40) NOT NULL, date DATE NOT NULL,
 duration INT NOT NULL, distance DOUBLE NOT NULL DEFAULT 0,
 calories INT NULL, note VARCHAR(500) NULL, location VARCHAR(120) NULL,
 latitude DOUBLE NULL, longitude DOUBLE NULL, image VARCHAR(120) NULL,
 created_at DATETIME(6) NOT NULL,
 CONSTRAINT fk_workout_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX ix_workout_user_date ON workouts(user_id,date);
CREATE TABLE goals (
 id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
 title VARCHAR(100) NOT NULL, metric VARCHAR(20) NOT NULL,
 target DOUBLE NOT NULL, period VARCHAR(20) NOT NULL,
 workout_type VARCHAR(40) NOT NULL, created_at DATETIME(6) NOT NULL,
 CONSTRAINT fk_goal_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX ix_goal_user ON goals(user_id);
CREATE TABLE reminders (
 id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
 title VARCHAR(100) NOT NULL, time CHAR(5) NOT NULL,
 days VARCHAR(30) NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE,
 created_at DATETIME(6) NOT NULL,
 CONSTRAINT fk_reminder_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX ix_reminder_user ON reminders(user_id);
CREATE TABLE workout_plans (
 id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
 date DATE NOT NULL, title VARCHAR(100) NOT NULL,
 type VARCHAR(40) NOT NULL, minutes INT NOT NULL,
 intensity VARCHAR(20) NOT NULL, note VARCHAR(500),
 status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
 completed_workout_id VARCHAR(36) NULL, created_at DATETIME(6) NOT NULL,
 CONSTRAINT fk_plan_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_plan_workout FOREIGN KEY(completed_workout_id) REFERENCES workouts(id) ON DELETE SET NULL
);
CREATE INDEX ix_plan_user_date ON workout_plans(user_id,date);
CREATE TABLE media_files (
 id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
 filename VARCHAR(100) NOT NULL, content_type VARCHAR(32) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 CONSTRAINT fk_media_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX ix_media_user ON media_files(user_id);

-- ---------- Section 2: V2__route_points.sql ----------
ALTER TABLE workouts ADD COLUMN route_points LONGTEXT NULL;

-- ---------- Section 3: V3__admin_tracking.sql ----------
-- Privacy-first usage metrics: opt-in, no raw location, notes, pictures or request bodies.
ALTER TABLE users ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN analytics_enabled BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE user_activity_events (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  screen_name VARCHAR(40) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_activity_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX ix_activity_date ON user_activity_events(created_at);
CREATE INDEX ix_activity_user_date ON user_activity_events(user_id,created_at);
CREATE TABLE admin_audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  actor_id VARCHAR(36) NULL,
  action VARCHAR(40) NOT NULL,
  target_id VARCHAR(36) NULL,
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_audit_actor FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX ix_admin_audit_date ON admin_audit_logs(created_at);

