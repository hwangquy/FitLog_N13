package com.fitlog.backend.repository;
import com.fitlog.backend.entity.AuthSession;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.util.*;
import java.time.*;
public interface AuthSessionRepository extends JpaRepository<AuthSession,String> {
 @EntityGraph(attributePaths="user")
 Optional<AuthSession> findByTokenHash(String tokenHash);
}
