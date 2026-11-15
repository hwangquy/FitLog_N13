USE fitlog_db;

ALTER TABLE admin_audit_logs
  ADD COLUMN IF NOT EXISTS reason VARCHAR(500) NULL;
