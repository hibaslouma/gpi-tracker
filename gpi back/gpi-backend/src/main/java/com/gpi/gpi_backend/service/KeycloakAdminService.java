package com.gpi.gpi_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import java.util.Collections;
import java.util.*;

@Service
public class KeycloakAdminService {
    @Value("${keycloak.admin.username}")
    private String adminUsername;

    @Value("${keycloak.admin.password}")
    private String adminPassword;

    @Value("${keycloak.admin.server-url}")
    private String serverUrl;

    @Value("${keycloak.admin.realm}")
    private String realm;

    @Value("${keycloak.admin.client-id}")
    private String clientId;

    @Value("${keycloak.admin.client-secret}")
    private String clientSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    private String getAdminToken() {
        String url = serverUrl + "/realms/master/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", "admin-cli");
        body.add("username", adminUsername);
        body.add("password", adminPassword);

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

            // ✅ Split full name into firstName + lastName
            String[] nameParts = username.trim().split("\\s+", 2);
            String firstName = nameParts[0];
            String lastName  = nameParts.length > 1 ? nameParts[1] : firstName;

            Map<String, Object> user = new HashMap<>();
            user.put("username", email);
            user.put("email", email);
            user.put("firstName", firstName);
            user.put("lastName", lastName);
            user.put("enabled", true);
            user.put("emailVerified", true);
            user.put("requiredActions", Collections.emptyList());

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(user, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() == HttpStatus.CREATED) {
                String userId = getUserId(token, email);
                setPassword(token, userId, password);
                assignRole(token, userId, role);
            }
        } catch (Exception e) {
            System.err.println(" Erreur création Keycloak: " + e.getMessage());
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
        credential.put("temporary", false);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(credential, headers);
        restTemplate.exchange(url, HttpMethod.PUT, request, Void.class);
        System.out.println(" Mot de passe défini pour userId: " + userId);
    }

    //  Fixed — handles empty list gracefully
    private String getUserId(String token, String email) {
        String url = serverUrl + "/admin/realms/" + realm + "/users?email=" + email;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<List> response = restTemplate.exchange(
                url, HttpMethod.GET, request, List.class
        );

        List body = response.getBody();
        if (body == null || body.isEmpty()) {
            throw new RuntimeException("Utilisateur introuvable dans Keycloak: " + email);
        }

        Map<String, Object> user = (Map<String, Object>) body.get(0);
        return (String) user.get("id");
    }

    private void assignRole(String token, String userId, String roleName) {
        try {
            String roleUrl = serverUrl + "/admin/realms/" + realm + "/roles/" + roleName;

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);

            HttpEntity<Void> roleRequest = new HttpEntity<>(headers);
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