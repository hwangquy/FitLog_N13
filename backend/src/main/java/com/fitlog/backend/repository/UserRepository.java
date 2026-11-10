package com.fitlog.backend.repository;
import com.fitlog.backend.entity.User;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.util.*;
import java.time.*;
public interface UserRepository extends JpaRepository<User,String> {
 Optional<User> findByEmail(String email);
 @Query("select u from User u where :q = '' or lower(u.name) like lower(concat('%',:q,'%')) or lower(u.email) like lower(concat('%',:q,'%'))")
 Page<User> adminSearch(@Param("q") String query, Pageable pageable);
}
