package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.dto.UserDTO;
import com.gpi.gpi_backend.dto.UserRequest;
import com.gpi.gpi_backend.dto.LogDTO;
import com.gpi.gpi_backend.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    // ─── GET ALL USERS ─────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<UserDTO>> getAll() {
        return ResponseEntity.ok(adminUserService.getAllUsers());
    }

    // ─── CREATE USER ───────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> create(@RequestBody UserRequest request) {
        try {
            String adminName = getCurrentUsername();
            UserDTO created = adminUserService.createUser(request, adminName);
            return ResponseEntity.ok(created);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Email déjà utilisé")) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la création: " + e.getMessage()));
        }
    }

    // ─── UPDATE USER ───────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody UserRequest request) {
        try {
            String adminName = getCurrentUsername();
            UserDTO updated = adminUserService.updateUser(id, request, adminName);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("introuvable")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la modification: " + e.getMessage()));
        }
    }

    // ─── DELETE USER ───────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            String adminName = getCurrentUsername();
            adminUserService.deleteUser(id, adminName);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            if (e.getMessage().contains("introuvable")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la suppression: " + e.getMessage()));
        }
    }

    // ─── GET USER LOGS ─────────────────────────────────────
    @GetMapping("/{id}/logs")
    public ResponseEntity<List<LogDTO>> getUserLogs(@PathVariable Long id) {
        List<LogDTO> logs = adminUserService.getUserLogs(id);
        return ResponseEntity.ok(logs);
    }

    // ─── FINALISER INSCRIPTION ─────────────────────────────
    @PostMapping("/finaliser-inscription")
    public ResponseEntity<?> finaliserInscription(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            adminUserService.finaliserInscription(email);
            return ResponseEntity.ok(Map.of("message", "Inscription finalisée"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ─── SYNC ORACLE TO KEYCLOAK ───────────────────────────
    @PostMapping("/sync-keycloak")
    public ResponseEntity<?> syncToKeycloak() {
        try {
            adminUserService.syncOracleToKeycloak();
            return ResponseEntity.ok(Map.of("message", "Synchronisation terminée"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ─── HELPER : GET CURRENT USERNAME ─────────────────────
    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return auth.getName();
        }
        return "System";
    }
}