package com.fitlog.backend.controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
@RestControllerAdvice
public class ApiErrorHandler {
 @ExceptionHandler(MethodArgumentNotValidException.class)
 ResponseEntity<Map<String,String>> invalid(MethodArgumentNotValidException e) {
  return ResponseEntity.badRequest().body(Map.of("message","Dữ liệu không hợp lệ; hãy kiểm tra các trường bắt buộc."));
 }
 @ExceptionHandler(HttpMessageNotReadableException.class)
 ResponseEntity<Map<String,String>> badJson(HttpMessageNotReadableException e) {
  return ResponseEntity.badRequest().body(Map.of("message","JSON không hợp lệ hoặc trường dữ liệu sai định dạng."));
 }
 @ExceptionHandler(ResponseStatusException.class)
 ResponseEntity<Map<String,String>> status(ResponseStatusException e) {
  return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"Không xử lý được yêu cầu.":e.getReason()));
 }
}
