package com.gpi.gpi_backend.dto;

import lombok.Data;

@Data
public class UserDTO {
    private String id;
    private String name;
    private String firstName;
    private String lastName;
    private String email;
    private boolean active;
    private boolean firstLogin;  // ✅ added

    // only used for create
    private String password;
    private String role;

    // ✅ Computed initials for frontend avatar
    public String getInitials() {
        if (firstName != null && lastName != null
                && !firstName.isBlank() && !lastName.isBlank()) {
            return (firstName.charAt(0) + "" + lastName.charAt(0)).toUpperCase();
        }
        if (name != null && name.length() >= 2) {
            return name.substring(0, 2).toUpperCase();
        }
        return "??";
    }
}