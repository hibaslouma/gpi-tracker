package com.gpi.gpi_backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "USERS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "USERNAME", nullable = false, length = 100)
    private String username;

    @Column(name = "EMAIL", nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "PASSWORD", nullable = false, length = 255)
    private String password;

    @Column(name = "PHONE", length = 20)
    private String phone;

    @Column(name = "ROLE", length = 20)
    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(name = "ACTIVE")
    private boolean active = true;

    @Column(name = "FIRST_LOGIN")
    private boolean firstLogin = true;

    @Column(name = "CREATED_AT")
    private LocalDate createdAt;

    @Column(name = "LAST_LOGIN")
    private LocalDateTime lastLogin;

    // 🔹 NEW: link to Keycloak user (sub claim)
    @Column(name = "KEYCLOAK_ID", unique = true, length = 64)
    private String keycloakId;

    // 🔹 NEW: client's IBAN (one IBAN per user for now)
    @Column(name = "IBAN", length = 34)
    private String iban;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserLog> logs = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDate.now();
    }

    public enum Role {
        Admin, Backoffice, Client
    }

    public String getInitials() {
        if (username == null || username.isBlank()) return "??";
        String[] parts = username.trim().split("\\s+");
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + "" + parts[1].charAt(0)).toUpperCase();
        }
        return username.substring(0, Math.min(2, username.length())).toUpperCase();
    }
}