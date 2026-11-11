package com.fitlog.backend.security;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.*;
import java.util.concurrent.ConcurrentHashMap;

/** Basic per-IP throttling; production multi-node deployments must use shared distributed limits. */
@Component @Order(Ordered.HIGHEST_PRECEDENCE)
public class LoginRateLimitFilter extends OncePerRequestFilter {
 private record Attempt(int count,Instant window) {}
 private final ConcurrentHashMap<String,Attempt> attempts=new ConcurrentHashMap<>();
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)
   throws ServletException,IOException {
  if("POST".equals(req.getMethod()) && req.getRequestURI().equals("/api/auth/login")) {
   String key=req.getRemoteAddr(); Instant now=Instant.now();
   Attempt a=attempts.compute(key,(k,old)->old==null||old.window().plus(Duration.ofMinutes(15)).isBefore(now)
     ? new Attempt(1,now) : new Attempt(old.count()+1,old.window()));
   if(a.count()>20){res.setStatus(429);res.setContentType("application/json");
     res.getWriter().write("{\"message\":\"Quá nhiều yêu cầu đăng nhập. Thử lại sau 15 phút.\"}");return;}
  }
  chain.doFilter(req,res);
 }
}
