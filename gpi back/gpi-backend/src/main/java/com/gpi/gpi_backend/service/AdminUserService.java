package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.dto.UserDTO;
import com.gpi.gpi_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final KeycloakAdminService keycloakAdminService;
    private final UserRepository userRepository;

    public List<UserDTO> getAllUsers() {
        return keycloakAdminService.getAllUsers();
    }

    public void deleteUser(String id) {
        keycloakAdminService.deleteUserById(id);
    }

    public void createUser(UserDTO dto) {
        keycloakAdminService.createUser(
                dto.getEmail(),
                dto.getName(),
                dto.getPassword(),
                dto.getRole()
        );
    }

    public void updateUser(String id, UserDTO dto) {
        keycloakAdminService.updateUser(id, dto);
    }

    // ✅ Set firstLogin = false after first password change
    public void finaliserInscription(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setFirstLogin(false);
            userRepository.save(user);
            System.out.println("[AdminUserService] ✅ firstLogin = false for: " + email);
        });
    }
}