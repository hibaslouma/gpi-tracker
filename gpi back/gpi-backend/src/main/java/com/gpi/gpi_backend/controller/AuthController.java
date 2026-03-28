package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.dto.ChangePasswordRequest;
import com.gpi.gpi_backend.service.KeycloakAdminService;
import com.gpi.gpi_backend.repository.UserRepository;
import com.gpi.gpi_backend.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    private final KeycloakAdminService keycloakAdminService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@RequestBody ChangePasswordRequest req) {
        // 1. Changer dans Keycloak
        String userId = keycloakAdminService.getUserIdByEmail(req.getEmail());
        keycloakAdminService.resetPassword(userId, req.getNewPassword());

        // 2. Synchroniser dans Oracle
        userRepository.findByEmail(req.getEmail()).ifPresent(user -> {
            user.setPassword(passwordEncoder.encode(req.getNewPassword()));
            userRepository.save(user);
        });

        return ResponseEntity.ok().build();
    }
}