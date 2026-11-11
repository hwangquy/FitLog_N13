package com.fitlog.backend.repository;
import com.fitlog.backend.entity.Workout;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.util.*;
import java.time.*;
public interface WorkoutRepository extends JpaRepository<Workout,String> {
 @Query("select w from Workout w where w.user.id=:uid and (:type is null or w.type=:type) and (:q is null or lower(w.title) like lower(concat('%',:q,'%')) or lower(w.note) like lower(concat('%',:q,'%')) or lower(w.location) like lower(concat('%',:q,'%')))")
 Page<Workout> search(@Param("uid") String userId,@Param("q") String query,@Param("type") String type, Pageable pageable);
 List<Workout> findByUserIdOrderByDateDescCreatedAtDesc(String userId);
 Optional<Workout> findByIdAndUserId(String id,String userId);
 long countByUserId(String userId);
}
