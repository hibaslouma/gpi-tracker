package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.dto.AuthResponse;
import com.gpi.gpi_backend.dto.LoginRequest;
import com.gpi.gpi_backend.model.User;
import com.gpi.gpi_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElse(null);

        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthResponse(null, null, null, "Email ou mot de passe incorrect", null));
        }

        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new AuthResponse(null, null, null, "Compte désactivé", null));
        }

        String role = user.getRole() != null ? user.getRole().name().toLowerCase() : "admin";

        return ResponseEntity.ok(new AuthResponse(
                "token-" + user.getId(), // token simple (sans JWT pour l'instant)
                user.getEmail(),
                user.getUsername(),
                "Connexion réussie",
                role
        ));
    }
}