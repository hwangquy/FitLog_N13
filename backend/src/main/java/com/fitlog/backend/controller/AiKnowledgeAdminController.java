package com.fitlog.backend.controller;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.fitlog.backend.service.AiVectorService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/ai/knowledge")
@PreAuthorize("hasRole('ADMIN')")
public class AiKnowledgeAdminController {
 private final JdbcTemplate db;private final AiVectorService vectors;private final ObjectMapper json;
 public AiKnowledgeAdminController(JdbcTemplate db,AiVectorService vectors,ObjectMapper json){this.db=db;this.vectors=vectors;this.json=json;}
 public record KnowledgeRequest(@NotBlank @Size(max=150) String title,
   @NotBlank @Size(max=50) String category,
   @NotBlank @Size(max=4000) String content,
   @NotBlank @Size(max=255) String source){}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) @Transactional
 public JsonNode add(@Valid @RequestBody KnowledgeRequest request){
  String id=UUID.randomUUID().toString();
  db.update("INSERT INTO ai_knowledge(id,title,category,content,source) VALUES(?,?,?,?,?)",
    id,request.title(),request.category(),request.content(),request.source());
  vectors.index(id,request.title(),request.category(),request.content(),request.source());
  ObjectNode out=json.createObjectNode();out.put("id",id);out.put("indexed",true);return out;
 }
 @PostMapping("/reindex")
 public JsonNode reindex(){
  record Entry(String id,String title,String category,String content,String source) {}
  var rows=db.query("SELECT id,title,category,content,source FROM ai_knowledge",(rs,n)->
    new Entry(rs.getString("id"),rs.getString("title"),rs.getString("category"),
       rs.getString("content"),rs.getString("source")));
  for(Entry e:rows) vectors.index(e.id(),e.title(),e.category(),e.content(),e.source());
  ObjectNode out=json.createObjectNode();out.put("indexedCount",rows.size());return out;
 }
}
