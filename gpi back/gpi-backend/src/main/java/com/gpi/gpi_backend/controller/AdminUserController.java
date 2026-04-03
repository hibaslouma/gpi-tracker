package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.dto.*;
import com.gpi.gpi_backend.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<List<UserDTO>> getAll() {
        return ResponseEntity.ok(adminUserService.getAllUsers());
    }

    @PostMapping
    public ResponseEntity<UserDTO> create(
            @RequestBody UserRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        String adminName = jwt.getClaimAsString("email");
        return ResponseEntity.ok(adminUserService.createUser(req, adminName));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> update(
            @PathVariable Long id,
            @RequestBody UserRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        String adminName = jwt.getClaimAsString("email");
        return ResponseEntity.ok(adminUserService.updateUser(id, req, adminName));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        String adminName = jwt.getClaimAsString("email");
        adminUserService.deleteUser(id, adminName);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<List<LogDTO>> getLogs(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserService.getUserLogs(id));
    }

    // ✅ Nouvel endpoint — finaliser inscription après reset mot de passe
    @PatchMapping("/finaliser-inscription")
    public ResponseEntity<Void> finaliserInscription(
            @AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email"); // ✅ extrait du token
        adminUserService.finaliserInscription(email);
        return ResponseEntity.ok().build();
    }
}