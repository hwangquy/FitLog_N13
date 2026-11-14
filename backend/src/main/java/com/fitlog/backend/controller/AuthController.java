package com.fitlog.backend.controller;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fitlog.backend.dto.ApiDtos.AuthResponse;
import com.fitlog.backend.dto.ApiDtos.LoginRequest;
import com.fitlog.backend.dto.ApiDtos.PublicUser;
import com.fitlog.backend.dto.ApiDtos.RegisterRequest;
import com.fitlog.backend.dto.ApiDtos.UpdateAvatarRequest;
import com.fitlog.backend.repository.MediaFileRepository;
import com.fitlog.backend.repository.UserRepository;
import com.fitlog.backend.security.CurrentUser;
import com.fitlog.backend.security.TokenService;
import com.fitlog.backend.service.AuthService;

import jakarta.validation.Valid;
@RestController @RequestMapping("/api/auth")
public class AuthController {
 private final AuthService auth;private final TokenService tokens;private final UserRepository users;
 private final MediaFileRepository mediaFiles;
 public AuthController(
    AuthService auth,
    TokenService tokens,
    UserRepository users,
    MediaFileRepository mediaFiles
) {
    this.auth = auth;
    this.tokens = tokens;
    this.users = users;
    this.mediaFiles = mediaFiles;
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

@PutMapping("/avatar")
@Transactional
public PublicUser updateAvatar(
    @RequestBody UpdateAvatarRequest request,
    Authentication authentication
) {
    String userId = CurrentUser.from(authentication).id();

    var user = users.findById(userId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.UNAUTHORIZED,
            "Không tìm thấy tài khoản."
        ));

    String avatar = request.avatar();

    if (avatar != null) {
        if (!avatar.matches("^/media/[a-fA-F0-9-]{36}$")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Đường dẫn ảnh không hợp lệ."
            );
        }

        String mediaId = avatar.substring("/media/".length());

        if (mediaFiles.findByIdAndUserId(mediaId, userId).isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Ảnh không thuộc tài khoản của bạn."
            );
        }
    }

    user.avatar = avatar;
    users.save(user);

    return PublicUser.of(user);
}

}
