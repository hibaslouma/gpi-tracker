package com.gpi.gpi_backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "USER_LOGS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @Column(name = "LOG_DATE")
    private LocalDateTime date;

    @Column(name = "ACTION", length = 100)
    private String action;

    @Column(name = "ADMIN_NAME", length = 100)
    private String admin;

    @PrePersist
    protected void onCreate() {
        if (this.date == null) this.date = LocalDateTime.now();
    }
}