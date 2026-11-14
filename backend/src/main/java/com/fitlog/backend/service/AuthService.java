package com.fitlog.backend.service;

import com.fitlog.backend.dto.ApiDtos.*;
import com.fitlog.backend.entity.*;
import com.fitlog.backend.repository.*;
import com.fitlog.backend.security.TokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {
 private final UserRepository users;
 private final TokenService tokens;
 private final PasswordEncoder encoder;
 private final JavaMailSender mailSender;

 @Value("${spring.mail.username:}")
 private String senderEmail;

 private record OtpEntry(String code, Instant expiresAt) {}
 private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();
 private final SecureRandom random = new SecureRandom();

 public AuthService(
     UserRepository users,
     TokenService tokens,
     PasswordEncoder encoder,
     JavaMailSender mailSender
 ) {
  this.users = users;
  this.tokens = tokens;
  this.encoder = encoder;
  this.mailSender = mailSender;
 }

 @Transactional
 public AuthResponse register(RegisterRequest req) {
  String email = req.email().trim().toLowerCase(Locale.ROOT);
  if (users.findByEmail(email).isPresent()) {
   throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được sử dụng.");
  }
  User u = new User();
  u.name = req.name().trim();
  u.email = email;
  u.role = "USER";
  u.passwordHash = encoder.encode(req.password());
  try {
   users.saveAndFlush(u);
  } catch (DataIntegrityViolationException e) {
   throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được sử dụng.");
  }
  return new AuthResponse(tokens.issue(u), "Bearer", PublicUser.of(u));
 }

 @Transactional
 public AuthResponse login(LoginRequest req) {
  String email = req.email().trim().toLowerCase(Locale.ROOT);
  User u = users.findByEmail(email).orElse(null);
  // Equalize timing for unknown users. Do not disclose whether the account exists.
  String hash = u == null ? "$2a$12$vI99MVqyT6C9AY9.gyW.2O5u6FSO7zeCdITDLZCdBBH9EMvc0HpDO" : u.passwordHash;
  boolean verified = encoder.matches(req.password(), hash);
  if (u == null || !verified) {
   throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng.");
  }
  if (!u.enabled) {
   throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị tạm khóa.");
  }
  return new AuthResponse(tokens.issue(u), "Bearer", PublicUser.of(u));
 }

 public void sendForgotPasswordOtp(ForgotPasswordRequest req) {
  String email = req.email().trim().toLowerCase(Locale.ROOT);
  User u = users.findByEmail(email)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Email không tồn tại trong hệ thống."));
  if (!u.enabled) {
   throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị tạm khóa.");
  }

  String otp = String.format("%06d", random.nextInt(1_000_000));
  otpStore.put(email, new OtpEntry(otp, Instant.now().plus(5, ChronoUnit.MINUTES)));

  try {
   SimpleMailMessage message = new SimpleMailMessage();
   if (senderEmail != null && !senderEmail.isBlank()) {
    message.setFrom(senderEmail);
   }
   message.setTo(email);
   message.setSubject("[FitLog] Mã xác thực OTP khôi phục mật khẩu");
   message.setText(
       "Xin chào " + u.name + ",\n\n" +
       "Mã OTP đặt lại mật khẩu tài khoản FitLog của bạn là: " + otp + "\n" +
       "Mã này có hiệu lực trong vòng 5 phút. Tuyệt đối không chia sẻ mã cho người khác.\n\n" +
       "Trân trọng,\nĐội ngũ FitLog"
   );
   mailSender.send(message);
  } catch (Exception e) {
   otpStore.remove(email);
   e.printStackTrace();
   throw new ResponseStatusException(
       HttpStatus.INTERNAL_SERVER_ERROR,
       "Lỗi gửi mail: " + e.getMessage()
   );
  }
 }

 public void verifyOtp(VerifyOtpRequest req) {
  String email = req.email().trim().toLowerCase(Locale.ROOT);
  OtpEntry entry = otpStore.get(email);
  if (entry == null) {
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn chưa yêu cầu mã OTP hoặc mã đã hết hạn.");
  }
  if (Instant.now().isAfter(entry.expiresAt())) {
   otpStore.remove(email);
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.");
  }
  if (!entry.code().equals(req.otp().trim())) {
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã OTP không chính xác.");
  }
 }

 @Transactional
 public void resetPassword(ResetPasswordRequest req) {
  String email = req.email().trim().toLowerCase(Locale.ROOT);
  verifyOtp(new VerifyOtpRequest(email, req.otp()));

  User u = users.findByEmail(email)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản."));
  if (!u.enabled) {
   throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị tạm khóa.");
  }

  u.passwordHash = encoder.encode(req.newPassword());
  users.save(u);
  otpStore.remove(email);
 }
}