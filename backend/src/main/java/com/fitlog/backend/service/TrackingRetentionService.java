package com.fitlog.backend.service;
import com.fitlog.backend.repository.UserActivityRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
/** Delete opt-in user activity after 90 days. Do not keep raw personal activity forever. */
@Service
public class TrackingRetentionService {
 private final UserActivityRepository events;
 public TrackingRetentionService(UserActivityRepository events){this.events=events;}
 @Scheduled(cron="0 10 3 * * *",zone="UTC")
 @Transactional public void prune(){events.deleteBefore(Instant.now().minus(Duration.ofDays(90)));}
}
