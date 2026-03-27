package com.gpi.gpi_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GpiBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(GpiBackendApplication.class, args);
    }
}