package com.fitlog.backend.service;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.ZoneOffset;

@Service
public class AiQuotaService {
 private final JdbcTemplate db;
 public AiQuotaService(JdbcTemplate db){this.db=db;}
 public void useOne(String uid){
  LocalDate day=LocalDate.now(ZoneOffset.UTC);
  db.update("INSERT IGNORE INTO ai_daily_usage(user_id,usage_day,used) VALUES(?,?,0)",uid,day);
  int updated=db.update("UPDATE ai_daily_usage SET used=used+1 WHERE user_id=? AND usage_day=? AND used<30",uid,day);
  if(updated!=1)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Đã hết 30 lượt AI/ngày.");
 }
}
