package com.gpi.gpi_backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.util.*;

@Service
@RequiredArgsConstructor
public class KeycloakAdminService {

    @Value("${keycloak.admin.server-url}")
    private String serverUrl;

    @Value("${keycloak.admin.realm}")
    private String realm;

    @Value("${keycloak.admin.client-id}")
    private String clientId;

    @Value("${keycloak.admin.client-secret}")
    private String clientSecret;

    private final RestTemplate restTemplate;

    private String getAdminToken() {
        String url = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

        return (String) response.getBody().get("access_token");
    }

    public void createUser(String email, String username, String password, String role) {
        try {
            String token = getAdminToken();
            String url = serverUrl + "/admin/realms/" + realm + "/users";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token);

            Map<String, Object> user = new HashMap<>();
            user.put("username", email);
            user.put("email", email);
            user.put("firstName", username);
            user.put("enabled", true);
            user.put("emailVerified", true);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(user, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            System.out.println("✅ Keycloak response: " + response.getStatusCode() + " - " + response.getBody());

            if (response.getStatusCode() == HttpStatus.CREATED) {
                String userId = getUserId(token, email);

                setPassword(token, userId, password);     // 1. mot de passe d'abord
                setRequiredActions(token, userId);        // 2. forcer changement
                assignRole(token, userId, role);          // 3. assigner rôle
            }
        } catch (Exception e) {
            System.err.println("❌ ERREUR KEYCLOAK: " + e.getMessage());
            throw new RuntimeException("Erreur Keycloak: " + e.getMessage());
        }
    }

    private void setPassword(String token, String userId, String password) {
        String url = serverUrl + "/admin/realms/" + realm + "/users/" + userId + "/reset-password";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", password);
        credential.put("temporary", true);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(credential, headers);
        restTemplate.exchange(url, HttpMethod.PUT, request, Void.class);
        System.out.println("✅ Mot de passe défini pour userId: " + userId);
    }

    private void setRequiredActions(String token, String userId) {
        String url = serverUrl + "/admin/realms/" + realm + "/users/" + userId;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, Object> body = new HashMap<>();
        body.put("requiredActions", List.of("UPDATE_PASSWORD"));

        restTemplate.exchange(url, HttpMethod.PUT, new HttpEntity<>(body, headers), Void.class);
        System.out.println("✅ RequiredAction UPDATE_PASSWORD ajouté");
    }

    private String getUserId(String token, String email) {
        String url = serverUrl + "/admin/realms/" + realm + "/users?email=" + email;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, request, List.class);

        Map<String, Object> user = (Map<String, Object>) response.getBody().get(0);
        return (String) user.get("id");
    }

    private void assignRole(String token, String userId, String roleName) {
        String roleUrl = serverUrl + "/admin/realms/" + realm + "/roles/" + roleName;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        HttpEntity<Void> roleRequest = new HttpEntity<>(headers);
        ResponseEntity<Map> roleResponse = restTemplate.exchange(roleUrl, HttpMethod.GET, roleRequest, Map.class);
        Map<String, Object> role = roleResponse.getBody();

        String url = serverUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm";
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<List<Map<String, Object>>> request = new HttpEntity<>(List.of(role), headers);
        restTemplate.postForEntity(url, request, Void.class);
    }

    public void deleteUser(String email) {
        String token = getAdminToken();
        String userId = getUserId(token, email);
        String url = serverUrl + "/admin/realms/" + realm + "/users/" + userId;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        restTemplate.exchange(url, HttpMethod.DELETE, new HttpEntity<>(headers), Void.class);
    }

    public String getUserIdByEmail(String email) {
        String token = getAdminToken();
        return getUserId(token, email);
    }

    public void resetPassword(String userId, String password) {
        String token = getAdminToken();

        // 1. Changer le mot de passe
        String url = serverUrl + "/admin/realms/" + realm + "/users/" + userId + "/reset-password";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", password);
        credential.put("temporary", false);

        restTemplate.exchange(url, HttpMethod.PUT, new HttpEntity<>(credential, headers), Void.class);

        // 2. ✅ Supprimer UPDATE_PASSWORD des requiredActions
        String userUrl = serverUrl + "/admin/realms/" + realm + "/users/" + userId;
        Map<String, Object> body = new HashMap<>();
        body.put("requiredActions", List.of()); // liste vide = plus d'actions requises

        restTemplate.exchange(userUrl, HttpMethod.PUT, new HttpEntity<>(body, headers), Void.class);
        System.out.println("✅ RequiredActions vidées pour userId: " + userId);
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
            System.out.println("✅ Statut Keycloak mis à jour: " + email + " → enabled=" + enabled);
        } catch (Exception e) {
            System.err.println("❌ Erreur update statut Keycloak: " + e.getMessage());
        }
    }
}