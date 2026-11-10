package com.fitlog.backend.security;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
public final class CurrentUser {
 private CurrentUser(){}
 public static FitPrincipal from(Authentication a) {
  if(a==null || !(a.getPrincipal() instanceof FitPrincipal p))
    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
  return p;
 }
}
