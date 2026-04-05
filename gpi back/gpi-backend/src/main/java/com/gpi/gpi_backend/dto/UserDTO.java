package com.gpi.gpi_backend.dto;

import lombok.Data;

@Data
public class UserDTO {
    private Long id;
    private String initials;
    private String name;
    private String email;
    private String phone;
    private String role;
    private boolean active;
    private boolean firstLogin; // ✅ déjà présent
    private String createdAt;   // ✅ ajouté
    private String lastLogin;
}