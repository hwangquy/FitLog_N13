package com.fitlog.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;

@Service
public class AiGateway {
 private final ObjectMapper json;
 private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
 @Value("${fitlog.ai.base-url}") private String url;
 @Value("${fitlog.ai.model}") private String model;
 @Value("${fitlog.ai.api-key:}") private String key;
 public AiGateway(ObjectMapper json) { this.json=json; }
 public JsonNode ask(String system, String user) {
  if (key == null || key.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Chưa cấu hình AI_API_KEY/GEMINI_API_KEY.");
  try {
   ObjectNode request=json.createObjectNode();
   request.put("model",model); request.put("temperature",0.2); request.put("max_tokens",1800); request.put("stream",false);
   request.putObject("response_format").put("type","json_object");
   request.putArray("messages").addObject().put("role","system").put("content",system);
   request.withArray("messages").addObject().put("role","user").put("content",user);
   HttpRequest req=HttpRequest.newBuilder(URI.create(url))
      .timeout(Duration.ofSeconds(90)).header("Content-Type","application/json")
      .header("Authorization","Bearer "+key)
      .POST(HttpRequest.BodyPublishers.ofString(request.toString())).build();
   HttpResponse<String> res=http.send(req,HttpResponse.BodyHandlers.ofString());
   if(res.statusCode()==429) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"AI đang bị giới hạn tốc độ.");
   if(res.statusCode()<200 || res.statusCode()>=300) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"AI HTTP "+res.statusCode());
   String content=json.readTree(res.body()).path("choices").path(0).path("message").path("content").asText("");
   if(content.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"AI không trả nội dung.");
   content=content.trim().replaceFirst("(?s)^```(?:json)?\\s*","").replaceFirst("(?s)\\s*```$","");
   return json.readTree(content);
  } catch(ResponseStatusException e){ throw e; }
    catch(Exception e){ throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Không kết nối hoặc đọc được kết quả AI.",e); }
 }
}
