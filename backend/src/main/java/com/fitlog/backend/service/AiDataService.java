package com.fitlog.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.time.*;

@Service
public class AiDataService {
 private final JdbcTemplate db; private final ObjectMapper json;
 public AiDataService(JdbcTemplate db,ObjectMapper json){this.db=db;this.json=json;}
 public boolean hasConsent(String uid){
  db.update("INSERT IGNORE INTO ai_profiles(user_id) VALUES(?)",uid);
  Boolean enabled=db.queryForObject("SELECT consent_enabled FROM ai_profiles WHERE user_id=?",Boolean.class,uid);
  return Boolean.TRUE.equals(enabled);
 }
 public ObjectNode context(String uid){
  ObjectNode root=json.createObjectNode();
  db.update("INSERT IGNORE INTO ai_profiles(user_id) VALUES(?)",uid);
  db.query("SELECT consent_enabled,goal,level,days_per_week,minutes_per_session,equipment,preferences FROM ai_profiles WHERE user_id=?",rs->{
   ObjectNode p=root.putObject("profile");p.put("consentEnabled",rs.getBoolean("consent_enabled"));p.put("goal",rs.getString("goal"));p.put("level",rs.getString("level"));
   p.put("daysPerWeek",rs.getInt("days_per_week"));p.put("minutesPerSession",rs.getInt("minutes_per_session"));
   p.put("equipment",rs.getString("equipment"));p.put("preferences",rs.getString("preferences"));
  },uid);
  LocalDate now=LocalDate.now();
  db.query("SELECT COUNT(*) AS n,COALESCE(SUM(duration),0) AS minutes FROM workouts WHERE user_id=? AND date>=? AND date<=?",rs->{
   ObjectNode o=root.putObject("last7Days");o.put("sessions",rs.getInt("n"));o.put("minutes",rs.getLong("minutes"));
  },uid,now.minusDays(6),now);
  db.query("SELECT COUNT(*) AS n,COALESCE(SUM(duration),0) AS minutes FROM workouts WHERE user_id=? AND date>=? AND date<?",rs->{
   ObjectNode o=root.putObject("previous7Days");o.put("sessions",rs.getInt("n"));o.put("minutes",rs.getLong("minutes"));
  },uid,now.minusDays(13),now.minusDays(6));
  ArrayNode workouts=root.putArray("recentWorkouts");
  db.query("SELECT title,type,date,duration,distance FROM workouts WHERE user_id=? ORDER BY date DESC,created_at DESC LIMIT 12",rs->{
   ObjectNode o=workouts.addObject();o.put("title",rs.getString("title"));o.put("type",rs.getString("type"));
   o.put("date",rs.getDate("date").toLocalDate().toString());o.put("minutes",rs.getInt("duration"));o.put("km",rs.getDouble("distance"));
  },uid);
  ArrayNode goals=root.putArray("goals");
  db.query("SELECT title,metric,target,period,workout_type FROM goals WHERE user_id=? ORDER BY created_at DESC LIMIT 8",rs->{
   ObjectNode o=goals.addObject();o.put("title",rs.getString("title"));o.put("metric",rs.getString("metric"));
   o.put("target",rs.getDouble("target"));o.put("period",rs.getString("period"));o.put("type",rs.getString("workout_type"));
  },uid);
  ArrayNode plans=root.putArray("upcomingPlans");
  db.query("SELECT id,title,type,date,minutes,intensity,status FROM workout_plans WHERE user_id=? AND date>=? AND date<=? ORDER BY date LIMIT 30",rs->{
   ObjectNode o=plans.addObject();o.put("planId",rs.getString("id"));o.put("title",rs.getString("title"));
   o.put("type",rs.getString("type"));o.put("date",rs.getDate("date").toLocalDate().toString());
   o.put("minutes",rs.getInt("minutes"));o.put("intensity",rs.getString("intensity"));o.put("status",rs.getString("status"));
  },uid,now,now.plusDays(28));
  db.query("SELECT fatigue,soreness,sleep_hours,created_at FROM ai_checkins WHERE user_id=? ORDER BY created_at DESC LIMIT 1",rs->{
   ObjectNode o=root.putObject("latestCheckin");o.put("fatigue",rs.getInt("fatigue"));o.put("soreness",rs.getInt("soreness"));
   if(rs.getObject("sleep_hours")!=null)o.put("sleepHours",rs.getDouble("sleep_hours"));
   o.put("createdAt",rs.getTimestamp("created_at").toInstant().toString());
  },uid);
  return root;
 }
}
