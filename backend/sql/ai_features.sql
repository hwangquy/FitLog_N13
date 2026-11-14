-- Chay 1 lan tren fitlog_db DA CO SAN, KHONG chay lai V1__schema.sql.
USE fitlog_db;
CREATE TABLE IF NOT EXISTS ai_profiles (
 user_id VARCHAR(36) PRIMARY KEY,
 consent_enabled BOOLEAN NOT NULL DEFAULT FALSE,
 goal VARCHAR(30) NOT NULL DEFAULT 'habit',
 level VARCHAR(30) NOT NULL DEFAULT 'beginner',
 days_per_week INT NOT NULL DEFAULT 3,
 minutes_per_session INT NOT NULL DEFAULT 40,
 equipment VARCHAR(300) NOT NULL DEFAULT 'Không có',
 preferences VARCHAR(500) NOT NULL DEFAULT '',
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
 id VARCHAR(36) PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 title VARCHAR(120) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX ix_ai_session_user (user_id,created_at)
);
CREATE TABLE IF NOT EXISTS ai_chat_messages (
 id VARCHAR(36) PRIMARY KEY,
 session_id VARCHAR(36) NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 role VARCHAR(20) NOT NULL,
 content LONGTEXT NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX ix_ai_message_session (session_id,created_at)
);
CREATE TABLE IF NOT EXISTS ai_actions (
 id VARCHAR(36) PRIMARY KEY,
 session_id VARCHAR(36) NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 action_type VARCHAR(30) NOT NULL,
 payload LONGTEXT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 applied_at DATETIME(6) NULL,
 FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX ix_ai_actions_user (user_id,status,created_at)
);
CREATE TABLE IF NOT EXISTS ai_checkins (
 id VARCHAR(36) PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 fatigue INT NOT NULL,
 soreness INT NOT NULL,
 sleep_hours DOUBLE NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX ix_ai_checkin_user (user_id,created_at)
);
CREATE TABLE IF NOT EXISTS ai_daily_usage (
 user_id VARCHAR(36) NOT NULL,
 usage_day DATE NOT NULL,
 used INT NOT NULL DEFAULT 0,
 PRIMARY KEY (user_id,usage_day),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ai_knowledge (
 id VARCHAR(36) PRIMARY KEY,
 title VARCHAR(150) NOT NULL,
 category VARCHAR(50) NOT NULL,
 content TEXT NOT NULL,
 source VARCHAR(255) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);
CREATE TABLE IF NOT EXISTS ai_weekly_reports (
 id VARCHAR(36) PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 week_start DATE NOT NULL,
 report TEXT NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uk_ai_report_user_week (user_id,week_start),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
