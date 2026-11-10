package com.fitlog.backend.security;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component
public class TokenAuthenticationFilter extends OncePerRequestFilter {
 private final TokenService tokens;
 public TokenAuthenticationFilter(TokenService tokens) { this.tokens=tokens; }
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)
   throws ServletException,IOException {
  String header=req.getHeader("Authorization");
  if(header!=null && header.startsWith("Bearer ")) {
   tokens.resolve(header.substring(7)).ifPresent(p -> {
    var auth=new UsernamePasswordAuthenticationToken(p,null,
       List.of(new SimpleGrantedAuthority("ROLE_"+p.role())));
    SecurityContextHolder.getContext().setAuthentication(auth);
   });
  }
  chain.doFilter(req,res);
 }
}
