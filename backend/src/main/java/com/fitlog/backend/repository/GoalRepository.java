package com.fitlog.backend.repository;
import com.fitlog.backend.entity.Goal;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.util.*;
import java.time.*;
public interface GoalRepository extends JpaRepository<Goal,String> {
 List<Goal> findByUserIdOrderByCreatedAtAsc(String userId);
 Optional<Goal> findByIdAndUserId(String id,String userId);
}
