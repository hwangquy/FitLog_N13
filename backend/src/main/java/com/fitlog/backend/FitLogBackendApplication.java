package com.fitlog.backend;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
@SpringBootApplication
@EnableScheduling
public class FitLogBackendApplication {
    public static void main(String[] args) { SpringApplication.run(FitLogBackendApplication.class, args); }
}
