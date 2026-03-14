package com.gpi.gpi_backend.dto;

import lombok.Data;

@Data
public class UserRequest {
    private String name;
    private String email;
    private String phone;
    private String role;
    private String password;
    private boolean active;
}