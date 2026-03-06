package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.dto.AuthResponse;
import com.gpi.gpi_backend.dto.LoginRequest;
import com.gpi.gpi_backend.dto.RegisterRequest;
import com.gpi.gpi_backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class UserController {

    @Autowired
    private AuthService authService;

    // ===== REGISTER =====
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ===== LOGIN =====
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Email ou mot de passe incorrect !");
        }
    }

    // ===== VERIFY TOKEN =====
    @GetMapping("/me")
    public ResponseEntity<?> me() {
        return ResponseEntity.ok("Token valide ✓");
    }
}