package com.fitlog.backend.repository;
import com.fitlog.backend.entity.AdminAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.*;
public interface AdminAuditRepository extends JpaRepository<AdminAuditLog,String> {
 Page<AdminAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
