package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.dto.ChangePasswordRequest;
import com.gpi.gpi_backend.dto.UserDTO;
import com.gpi.gpi_backend.service.KeycloakAdminService;
import com.gpi.gpi_backend.service.AdminUserService;
import com.gpi.gpi_backend.repository.UserRepository;
import com.gpi.gpi_backend.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    private final KeycloakAdminService keycloakAdminService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminUserService adminUserService;

    // ✅ Endpoint 1 — récupérer firstLogin après login
    @GetMapping("/me")
    public ResponseEntity<UserDTO> me(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");

        UserDTO dto = new UserDTO();
        dto.setEmail(email);

        // ✅ si utilisateur pas dans Oracle (ex: Super Admin Keycloak)
        // → firstLogin = false par défaut
        userRepository.findByEmail(email).ifPresentOrElse(
                user -> {
                    dto.setName(user.getUsername());
                    dto.setRole(user.getRole() != null ? user.getRole().name() : "Admin");
                    dto.setFirstLogin(user.isFirstLogin());
                    dto.setActive(user.isActive());
                },
                () -> {
                    dto.setFirstLogin(false); // ✅ Admin Keycloak → pas de reset forcé
                    dto.setRole("Admin");
                }
        );

        return ResponseEntity.ok(dto);
    }

    // ✅ Endpoint 2 — changer mot de passe première connexion
    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @RequestBody ChangePasswordRequest req ,
            @AuthenticationPrincipal Jwt jwt) {

        // 1. Changer dans Keycloak
        String userId =  jwt.getClaimAsString("sub");
        keycloakAdminService.resetPassword(userId, req.getNewPassword());

        // 2. Synchroniser dans Oracle
        userRepository.findByEmail(req.getEmail()).ifPresent(user -> {
            user.setPassword(passwordEncoder.encode(req.getNewPassword()));
            userRepository.save(user);
        });

        return ResponseEntity.ok().build();
    }

    // Endpoint 3 — finaliser inscription (first_login = false)
    @PatchMapping("/finaliser-inscription")
    public ResponseEntity<Void> finaliserInscription(
            @AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        adminUserService.finaliserInscription(email);
        return ResponseEntity.ok().build();
    }

}