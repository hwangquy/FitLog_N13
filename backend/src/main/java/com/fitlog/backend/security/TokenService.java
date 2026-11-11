package com.fitlog.backend.security;
import com.fitlog.backend.entity.*;
import com.fitlog.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.security.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.HexFormat;

@Service
public class TokenService {
 private final AuthSessionRepository sessions;
 private final SecureRandom random = new SecureRandom();
 public TokenService(AuthSessionRepository sessions) { this.sessions=sessions; }
 public static String sha256(String raw) {
  try {
   byte[] digest=MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
   return HexFormat.of().formatHex(digest);
  } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
 }
 @Transactional
 public String issue(User user) {
  byte[] bytes=new byte[32];random.nextBytes(bytes);
  String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  AuthSession s=new AuthSession();s.user=user;s.tokenHash=sha256(token);
  s.expiresAt=Instant.now().plus(Duration.ofDays(14));sessions.save(s);
  return token;
 }
 @Transactional(readOnly=true)
 public Optional<FitPrincipal> resolve(String token) {
  if(token==null || !token.matches("[A-Za-z0-9_-]{43}")) return Optional.empty();
  return sessions.findByTokenHash(sha256(token))
      .filter(s -> s.revokedAt==null && s.expiresAt.isAfter(Instant.now()) && s.user.enabled)
      .map(s -> new FitPrincipal(s.user.id,s.user.email,s.user.role,s.id));
 }
 @Transactional
 public void revoke(String sessionId) {
  sessions.findById(sessionId).ifPresent(s -> {s.revokedAt=Instant.now();sessions.save(s);});
 }
}
