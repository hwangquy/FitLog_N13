package com.fitlog.backend.config;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.fitlog.backend.security.TokenAuthenticationFilter;

@Configuration @EnableMethodSecurity
public class SecurityConfig {
 @Bean FilterRegistrationBean<TokenAuthenticationFilter> disableServletFilterRegistration(TokenAuthenticationFilter filter) {
  FilterRegistrationBean<TokenAuthenticationFilter> bean=new FilterRegistrationBean<>(filter);
  bean.setEnabled(false); // Auth filter must run in Spring Security chain only.
  return bean;
 }
 @Bean PasswordEncoder encoder(){return new BCryptPasswordEncoder(12);}
 @Bean SecurityFilterChain chain(HttpSecurity http,TokenAuthenticationFilter filter) throws Exception {
  return http.csrf(csrf->csrf.disable()) // no cookies; stateless bearer authorization only
   .cors(c->{}).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
   .formLogin(f->f.disable()).httpBasic(h->h.disable())
   .authorizeHttpRequests(a->a
      .requestMatchers(HttpMethod.POST,"/api/auth/register","/api/auth/login").permitAll()
      .requestMatchers("/actuator/health", "/error").permitAll()
      .requestMatchers("/api/admin/**").hasRole("ADMIN")
      .anyRequest().authenticated())
   .exceptionHandling(e->e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
     .accessDeniedHandler((r,s,x)->s.sendError(403)))
   .addFilterBefore(filter,UsernamePasswordAuthenticationFilter.class).build();
 }
 @Bean CorsConfigurationSource corsConfigurationSource(@Value("${fitlog.cors-origins}") String origins) {
  CorsConfiguration conf=new CorsConfiguration();
  conf.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
  conf.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
  conf.setAllowedHeaders(List.of("Authorization","Content-Type","Accept"));
  conf.setExposedHeaders(List.of("X-Total-Count"));
  conf.setAllowCredentials(false);
  UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();
  source.registerCorsConfiguration("/**",conf);
  return source;
 }
}
