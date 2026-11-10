package com.fitlog.backend.repository;
import com.fitlog.backend.entity.UserActivityEvent;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
public interface UserActivityRepository extends JpaRepository<UserActivityEvent,String> {
 @Modifying @Query("delete from UserActivityEvent e where e.user.id = :id")
 int deleteByOwner(@Param("id") String userId);
 @Modifying @Query("delete from UserActivityEvent e where e.createdAt < :cutoff")
 int deleteBefore(@Param("cutoff") Instant cutoff);
 long countByUserIdAndCreatedAtAfter(String userId, Instant since);
}
