package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.dto.*;
import com.gpi.gpi_backend.model.*;
import com.gpi.gpi_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final UserLogRepository userLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final KeycloakAdminService keycloakAdminService;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter D_FMT  = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public UserDTO createUser(UserRequest req, String adminName) {
        if (userRepository.existsByEmail(req.getEmail()))
            throw new RuntimeException("Email déjà utilisé !");

        User user = new User();
        user.setUsername(req.getName());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());
        user.setRole(User.Role.valueOf(req.getRole()));
        user.setActive(true);
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user = userRepository.save(user);

        // Créer dans Keycloak
        keycloakAdminService.createUser(
                req.getEmail(),
                req.getName(),
                req.getPassword(),
                req.getRole()
        );

        logAction(user, "Création compte", adminName);
        return toDTO(user);
    }

    public UserDTO updateUser(Long id, UserRequest req, String adminName) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        user.setUsername(req.getName());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());
        user.setRole(User.Role.valueOf(req.getRole()));
        user.setActive(req.isActive());

        if (req.getPassword() != null && !req.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(req.getPassword()));

            // Réinitialiser le mot de passe dans Keycloak aussi
            try {
                String userId = keycloakAdminService.getUserIdByEmail(user.getEmail());
                keycloakAdminService.resetPassword(userId, req.getPassword());
            } catch (Exception e) {
                System.err.println("❌ Erreur reset mdp Keycloak: " + e.getMessage());
            }

            logAction(user, "Réinitialisation mdp", adminName);
        }

        user = userRepository.save(user);
        // Synchroniser le statut avec Keycloak
        keycloakAdminService.updateUserStatus(user.getEmail(), user.isActive());
        logAction(user, "Modification", adminName);
        return toDTO(user);
    }

    @Transactional
    public void deleteUser(Long id, String adminName) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        // Supprimer dans Keycloak
        keycloakAdminService.deleteUser(user.getEmail());

        // Supprimer les logs liés AVANT de supprimer l'utilisateur
        userLogRepository.deleteByUserId(id);

        userRepository.delete(user);
    }

    public List<LogDTO> getUserLogs(Long userId) {
        return userLogRepository.findByUserIdOrderByDateDesc(userId)
                .stream()
                .map(this::toLogDTO)
                .collect(Collectors.toList());
    }

    private UserDTO toDTO(User u) {
        UserDTO dto = new UserDTO();
        dto.setId(u.getId());
        dto.setInitials(u.getInitials());
        dto.setName(u.getUsername());
        dto.setEmail(u.getEmail());
        dto.setPhone(u.getPhone());
        dto.setRole(u.getRole() != null ? u.getRole().name() : "Client");
        dto.setActive(u.isActive());
        dto.setCreatedAt(u.getCreatedAt() != null ? u.getCreatedAt().format(D_FMT) : "-");
        dto.setLastLogin(u.getLastLogin() != null ? u.getLastLogin().format(D_FMT) : "-");
        return dto;
    }

    private LogDTO toLogDTO(UserLog log) {
        LogDTO dto = new LogDTO();
        dto.setDate(log.getDate() != null ? log.getDate().format(DT_FMT) : "-");
        dto.setAction(log.getAction());
        dto.setAdmin(log.getAdmin());
        return dto;
    }

    private void logAction(User user, String action, String adminName) {
        UserLog log = UserLog.builder()
                .user(user)
                .action(action)
                .admin(adminName)
                .build();
        userLogRepository.save(log);
    }
}