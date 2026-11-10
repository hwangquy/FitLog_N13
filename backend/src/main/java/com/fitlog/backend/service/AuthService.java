package com.fitlog.backend.service;
import com.fitlog.backend.dto.ApiDtos.*;
import com.fitlog.backend.entity.*;
import com.fitlog.backend.repository.*;
import com.fitlog.backend.security.TokenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.Locale;

@Service
public class AuthService {
 private final UserRepository users; private final TokenService tokens; private final PasswordEncoder encoder;
 public AuthService(UserRepository users, TokenService tokens, PasswordEncoder encoder) {
  this.users=users;this.tokens=tokens;this.encoder=encoder;
 }
 @Transactional
 public AuthResponse register(RegisterRequest req) {
  String email=req.email().trim().toLowerCase(Locale.ROOT);
  if(users.findByEmail(email).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Email đã được sử dụng.");
  User u=new User();u.name=req.name().trim();u.email=email;u.role="USER";
  u.passwordHash=encoder.encode(req.password());
  try {users.saveAndFlush(u);} catch(DataIntegrityViolationException e) {
   throw new ResponseStatusException(HttpStatus.CONFLICT,"Email đã được sử dụng.");
  }
  return new AuthResponse(tokens.issue(u),"Bearer",PublicUser.of(u));
 }
 @Transactional
 public AuthResponse login(LoginRequest req) {
  String email=req.email().trim().toLowerCase(Locale.ROOT);
  User u=users.findByEmail(email).orElse(null);
  // Equalize timing for unknown users. Do not disclose whether the account exists.
  String hash=u==null?"$2a$12$vI99MVqyT6C9AY9.gyW.2O5u6FSO7zeCdITDLZCdBBH9EMvc0HpDO":u.passwordHash;
  boolean verified=encoder.matches(req.password(),hash);
  if(u==null||!verified) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Email hoặc mật khẩu không đúng.");
  if(!u.enabled) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Tài khoản đã bị tạm khóa.");
  return new AuthResponse(tokens.issue(u),"Bearer",PublicUser.of(u));
 }
}
