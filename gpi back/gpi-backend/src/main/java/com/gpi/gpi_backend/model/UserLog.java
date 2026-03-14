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
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "log_seq")
    @SequenceGenerator(name = "log_seq", sequenceName = "LOG_SEQ", allocationSize = 1)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @Column(name = "ACTION")
    private String action;

    @Column(name = "ADMIN")
    private String admin;

    @Column(name = "DATE_ACTION")
    private LocalDateTime date;

    @PrePersist
    public void prePersist() {
        this.date = LocalDateTime.now();
    }
}