package com.fitlog.backend.repository;
import com.fitlog.backend.entity.MediaFile;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.util.*;
import java.time.*;
public interface MediaFileRepository extends JpaRepository<MediaFile,String> {
 Optional<MediaFile> findByIdAndUserId(String id,String userId);
}
