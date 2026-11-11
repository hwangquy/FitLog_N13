package com.fitlog.backend.controller;
import com.fitlog.backend.entity.*;
import com.fitlog.backend.repository.*;
import com.fitlog.backend.security.CurrentUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.*;
import java.nio.file.*;
import java.util.*;

@RestController @RequestMapping("/api/media")
public class MediaController {
 private final MediaFileRepository files;private final UserRepository users;private final Path root;
 public MediaController(MediaFileRepository files,UserRepository users,@Value("${fitlog.storage-dir}") String path){
  this.files=files;this.users=users;this.root=Paths.get(path).toAbsolutePath().normalize();
 }
 @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @ResponseStatus(HttpStatus.CREATED) @Transactional
 public Map<String,String> upload(@RequestParam("file") MultipartFile file,Authentication a) throws IOException {
  if(file.isEmpty()||file.getSize()>5_000_000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ảnh phải nhỏ hơn 5 MB.");
  byte[] bytes=file.getBytes();
  boolean jpg=bytes.length>3&&(bytes[0]&255)==0xff&&(bytes[1]&255)==0xd8&&(bytes[2]&255)==0xff;
  boolean png=bytes.length>8&&(bytes[0]&255)==0x89&&bytes[1]==0x50&&bytes[2]==0x4e&&bytes[3]==0x47;
  if(!jpg&&!png) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Chỉ chấp nhận JPG hoặc PNG.");
  Path sub=root.resolve(CurrentUser.from(a).id()); Files.createDirectories(sub);
  MediaFile m=new MediaFile();m.user=users.getReferenceById(CurrentUser.from(a).id());
  m.filename=m.id+(jpg?".jpg":".png");m.contentType=jpg?"image/jpeg":"image/png";
  Path dest=sub.resolve(m.filename).normalize();
  if(!dest.startsWith(sub)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  try {Files.write(dest,bytes,StandardOpenOption.CREATE_NEW);files.save(m);}
  catch(RuntimeException|IOException e){Files.deleteIfExists(dest);throw e;}
  return Map.of("image","/media/"+m.id);
 }
 @GetMapping("/{id}") @Transactional(readOnly=true)
 public ResponseEntity<Resource> get(@PathVariable String id,Authentication a) throws IOException {
  MediaFile m=files.findByIdAndUserId(id,CurrentUser.from(a).id())
      .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
  Path path=root.resolve(CurrentUser.from(a).id()).resolve(m.filename).normalize();
  if(!path.startsWith(root)||!Files.isRegularFile(path)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  return ResponseEntity.ok().contentType(MediaType.parseMediaType(m.contentType))
   .cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff")
   .body(new FileSystemResource(path));
 }
}
