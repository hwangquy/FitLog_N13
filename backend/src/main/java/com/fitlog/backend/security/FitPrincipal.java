package com.fitlog.backend.security;
/** Authenticated principal. No password, and never supplied by the client. */
public record FitPrincipal(String id,String email,String role,String sessionId) {}
