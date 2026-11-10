package com.fitlog.backend.repository;
import com.fitlog.backend.entity.WorkoutPlan;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.util.*;
import java.time.*;
public interface WorkoutPlanRepository extends JpaRepository<WorkoutPlan,String> {
 List<WorkoutPlan> findByUserIdAndDateBetweenOrderByDateAsc(String userId,LocalDate from,LocalDate to);
 Optional<WorkoutPlan> findByIdAndUserId(String id,String userId);
}
