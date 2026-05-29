package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.model.User;
import com.gpi.gpi_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
@Service
@RequiredArgsConstructor
public class UserProvisioningService {

    private final UserRepository userRepository;

    /**
     * Ensure there is a local User row for this Keycloak JWT.
     * If not found, creates one with role inferred from realm_access.roles.
     */
    public User ensureUserFromJwt(Jwt jwt) {
        String keycloakId = jwt.getSubject();                  // "sub"
        String email = jwt.getClaimAsString("email");
        if (email == null) {
            email = jwt.getClaimAsString("preferred_username");
        }
        String username = jwt.getClaimAsString("name");
        if (username == null) {
            username = (email != null) ? email : keycloakId;
        }

        // 1️⃣ Try by keycloakId
        Optional<User> byKeycloak = userRepository.findByKeycloakId(keycloakId);
        if (byKeycloak.isPresent()) {
            User existing = byKeycloak.get();

            // Corriger l'IBAN si le rôle n'est pas Client
            User.Role role = extractRoleFromJwt(jwt);
            if (role != User.Role.Client && existing.getIban() != null) {
                existing.setIban(null);
                existing.setRole(role);
                return userRepository.save(existing);
            }

            return existing;
        }
        // 2️⃣ Try by email (existing user without keycloakId)
        // 2️⃣ Try by email (existing user without keycloakId)
        if (email != null) {
            Optional<User> byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                User existing = byEmail.get();
                existing.setKeycloakId(keycloakId);

                // Sync role from JWT
                User.Role role = extractRoleFromJwt(jwt);
                existing.setRole(role);

                // IBAN uniquement pour les clients
                if (role != User.Role.Client) {
                    existing.setIban(null);
                } else if (existing.getIban() == null) {
                    existing.setIban(generateIban());
                }

                return userRepository.save(existing);
            }
        }

        // 3️⃣ Create new local user
        User.Role role = extractRoleFromJwt(jwt);

        User newUser = User.builder()
                .keycloakId(keycloakId)
                .iban(role == User.Role.Client ? generateIban() : null)
                .email(email != null ? email : (keycloakId + "@unknown"))
                .username(username)
                .password("N/A") // not used, authentication is via Keycloak
                .role(role)
                .active(true)
                .firstLogin(true)
                .build();

        return userRepository.save(newUser);
    }

    private User.Role extractRoleFromJwt(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess != null) {
            Object rolesObj = realmAccess.get("roles");
            if (rolesObj instanceof List<?> roles) {
                for (Object r : roles) {
                    String role = String.valueOf(r);
                    if ("Admin".equalsIgnoreCase(role)) return User.Role.Admin;
                    if ("Backoffice".equalsIgnoreCase(role)) return User.Role.Backoffice;
                    if ("Client".equalsIgnoreCase(role)) return User.Role.Client;
                }
            }
        }
        // Default role if none found
        return User.Role.Client;
    }
    private String generateIban() {
        return "TN59" + UUID.randomUUID().toString().replace("-", "").substring(0, 14).toUpperCase();
    }
}