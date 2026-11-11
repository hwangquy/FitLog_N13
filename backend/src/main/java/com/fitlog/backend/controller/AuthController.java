package com.fitlog.backend.controller;
import com.fitlog.backend.dto.ApiDtos.*;
import com.fitlog.backend.repository.UserRepository;
import com.fitlog.backend.security.*;
import com.fitlog.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequestMapping("/api/auth")
public class AuthController {
 private final AuthService auth;private final TokenService tokens;private final UserRepository users;
 public AuthController(AuthService auth,TokenService tokens,UserRepository users) {
  this.auth=auth;this.tokens=tokens;this.users=users;
 }
 @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
 public AuthResponse register(@Valid @RequestBody RegisterRequest r) { return auth.register(r); }
 @PostMapping("/login") public AuthResponse login(@Valid @RequestBody LoginRequest r) { return auth.login(r); }
 @PostMapping("/logout") public ResponseEntity<Void> logout(Authentication a) {
  tokens.revoke(CurrentUser.from(a).sessionId());return ResponseEntity.noContent().build();
 }
 @GetMapping("/me") public PublicUser me(Authentication a) {
  var p=CurrentUser.from(a);
  return PublicUser.of(users.findById(p.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED)));
 }
}
