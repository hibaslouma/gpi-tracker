package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.dto.UserDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class KeycloakAdminService {

    @Value("${keycloak.admin.server-url}")
    private String serverUrl;

    @Value("${keycloak.admin.realm}")
    private String realm;

    @Value("${keycloak.admin.username}")
    private String username;

    @Value("${keycloak.admin.password}")
    private String password;

    private final RestTemplate restTemplate = new RestTemplate();

    // ── Admin Token ────────────────────────────────────────────
    private String getAdminToken() {
        String url = serverUrl + "/realms/master/protocol/openid-connect/token";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", "admin-cli");
        body.add("username", username);
        body.add("password", password);
        ResponseEntity<Map> response = restTemplate.postForEntity(
                url, new HttpEntity<>(body, headers), Map.class);
        return (String) response.getBody().get("access_token");
    }

    // ── GET ALL USERS with roles ───────────────────────────────
    public List<UserDTO> getAllUsers() {
        String token = getAdminToken();
        String url = serverUrl + "/admin/realms/" + realm + "/users?max=200";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<List> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), List.class);
        List<Map<String, Object>> users = response.getBody();
        if (users == null) return List.of();
        return users.stream().map(u -> mapUserWithRole(u, token)).toList();
    }

    // ── MAP USER + fetch realm roles ───────────────────────────
    private UserDTO mapUserWithRole(Map<String, Object> u, String token) {
        UserDTO dto = new UserDTO();
        dto.setId((String) u.get("id"));
        dto.setName((String) u.get("username"));
        dto.setEmail((String) u.get("email"));
        dto.setActive(Boolean.TRUE.equals(u.get("enabled")));
        dto.setFirstName((String) u.get("firstName"));
        dto.setLastName((String) u.get("lastName"));
        dto.setRole(getUserRealmRole(dto.getId(), token));
        return dto;
    }

    // ── GET realm roles for a user ─────────────────────────────
    private String getUserRealmRole(String userId, String token) {
        try {
            String url = serverUrl + "/admin/realms/" + realm
                    + "/users/" + userId + "/role-mappings/realm";
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            ResponseEntity<List> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), List.class);
            List<Map<String, Object>> roles = response.getBody();
            if (roles == null || roles.isEmpty()) return "Client";
            for (Map<String, Object> role : roles) {
                if ("Admin".equals(role.get("name"))) return "Admin";
            }
            for (Map<String, Object> role : roles) {
                if ("Backoffice".equals(role.get("name"))) return "Backoffice";
            }
            for (Map<String, Object> role : roles) {
                if ("Client".equals(role.get("name"))) return "Client";
            }
            return "Client";
        } catch (Exception e) {
            System.err.println("[KeycloakAdminService] ⚠️ Could not fetch roles for "
                    + userId + ": " + e.getMessage());
            return "Client";
        }
    }

    // ── GET USER ID BY EMAIL ───────────────────────────────────
    public String getUserIdByEmail(String email) {
        String token = getAdminToken();
        String url = serverUrl + "/admin/realms/" + realm
                + "/users?email=" + email + "&exact=true";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<List> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), List.class);
        List<Map<String, Object>> users = response.getBody();
        if (users == null || users.isEmpty()) {
            throw new RuntimeException("User not found in Keycloak: " + email);
        }
        return (String) users.get(0).get("id");
    }

    // ── RESET PASSWORD ─────────────────────────────────────────
    public void resetPassword(String userId, String newPassword) {
        String token = getAdminToken();
        String url = serverUrl + "/admin/realms/" + realm
                + "/users/" + userId + "/reset-password";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", newPassword);
        credential.put("temporary", false);
        restTemplate.exchange(url, HttpMethod.PUT,
                new HttpEntity<>(credential, headers), Void.class);
        System.out.println("[KeycloakAdminService] ✅ Password reset for: " + userId);
    }

    // ── DELETE USER ────────────────────────────────────────────
    public void deleteUserById(String id) {
        String token = getAdminToken();
        String url = serverUrl + "/admin/realms/" + realm + "/users/" + id;
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        restTemplate.exchange(url, HttpMethod.DELETE,
                new HttpEntity<>(headers), Void.class);
    }

    // ── CREATE USER + assign role ──────────────────────────────
    public void createUser(String email, String username, String password, String role) {
        String token = getAdminToken();
        String url = serverUrl + "/admin/realms/" + realm + "/users";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        // ✅ Keycloak does not allow @ in username — use email prefix
        // ✅ Always use email prefix as username (no spaces, no @, lowercase)
        String safeUsername = email.split("@")[0].toLowerCase().replaceAll("[^a-z0-9._-]", "");


        Map<String, Object> user = new HashMap<>();
        user.put("username", safeUsername);
        user.put("email", email);
        user.put("enabled", true);

        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", password);
        credential.put("temporary", true);
        user.put("credentials", List.of(credential));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(credential, headers);
        restTemplate.exchange(url, HttpMethod.PUT, request, Void.class);
        System.out.println(" Mot de passe défini pour userId: " + userId);
    }

    //  Fixed — handles empty list gracefully
    private String getUserId(String token, String email) {
        String url = serverUrl + "/admin/realms/" + realm + "/users?email=" + email;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, Object> user = new HashMap<>();
        if (dto.getEmail()     != null) user.put("email",     dto.getEmail());
        if (dto.getName()      != null) user.put("username",  dto.getName());
        if (dto.getFirstName() != null) user.put("firstName", dto.getFirstName());
        if (dto.getLastName()  != null) user.put("lastName",  dto.getLastName());
        user.put("enabled", dto.isActive());

        restTemplate.exchange(url, HttpMethod.PUT,
                new HttpEntity<>(user, headers), Void.class);

        // Update password if provided
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            resetPassword(userId, dto.getPassword());
        }

        System.out.println("[KeycloakAdminService] ✅ User updated: " + userId);
    }

    // ── ASSIGN realm role to user ──────────────────────────────
    private void assignRealmRole(String userId, String roleName, String token) {
        try {
            String roleUrl = serverUrl + "/admin/realms/" + realm + "/roles/" + roleName;
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> roleResponse = restTemplate.exchange(
                    roleUrl, HttpMethod.GET, roleRequest, Map.class
            );
            Map<String, Object> role = roleResponse.getBody();

            String url = serverUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm";
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<List<Map<String, Object>>> request = new HttpEntity<>(List.of(role), headers);
            restTemplate.postForEntity(url, request, Void.class);

            System.out.println(" Rôle assigné: " + roleName + " → userId: " + userId);
        } catch (Exception e) {
            System.err.println(" ERREUR assignRole: " + e.getMessage());
            System.err.println(" Role name used: " + roleName);
            throw new RuntimeException("Erreur assignation rôle: " + e.getMessage());
        }
    }

    public void deleteUser(String email) {
        try {
            System.out.println(" Tentative suppression Keycloak pour: " + email);
            String token = getAdminToken();
            System.out.println(" Token admin obtenu");
            String userId = getUserId(token, email);
            System.out.println(" UserId trouvé: " + userId);
            String url = serverUrl + "/admin/realms/" + realm + "/users/" + userId;

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);

            restTemplate.exchange(url, HttpMethod.DELETE, new HttpEntity<>(headers), Void.class);
            System.out.println(" Utilisateur supprimé de Keycloak: " + email);
        } catch (Exception e) {
            System.err.println(" Erreur suppression Keycloak: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public String getUserIdByEmail(String email) {
        String token = getAdminToken();
        return getUserId(token, email);
    }

    public void resetPassword(String userId, String password) {
        String token = getAdminToken();
        setPassword(token, userId, password);
    }

    public void updateUserStatus(String email, boolean enabled) {
        try {
            String token = getAdminToken();
            String userId = getUserId(token, email);
            String url = serverUrl + "/admin/realms/" + realm + "/users/" + userId;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token);

            Map<String, Object> body = new HashMap<>();
            body.put("enabled", enabled);

            restTemplate.exchange(url, HttpMethod.PUT, new HttpEntity<>(body, headers), Void.class);
            System.out.println("Statut mis à jour pour: " + email + " → " + enabled);
        } catch (Exception e) {
            System.err.println(" Erreur update statut Keycloak: " + e.getMessage());
        }
    }
}