package com.gpi.gpi_backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "CAMT056")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Camt056 {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "MESSAGE_ID", length = 100)
    private String messageId;

    @Column(name = "ORIGINAL_MSG_ID", length = 100)
    private String originalMsgId;

    @Column(name = "UETR", length = 100)
    private String uetr;

    @Column(name = "BIC_EMETTEUR", length = 20)
    private String bicEmetteur;

    @Column(name = "BIC_RECEPTEUR", length = 20)
    private String bicRecepteur;

    @Column(name = "MOTIF", length = 100)
    private String motif;

    @Column(name = "MOTIF_DETAIL", length = 500)
    private String motifDetail;

    @Column(name = "STATUT", length = 10)
    private String statut; // PDNG, ACCP, RJCT

    @Column(name = "MOTIF_REFUS", length = 20)
    private String motifRefus;

    @Column(name = "FILE_NAME", length = 255)
    private String fileName;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;

    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.statut == null) this.statut = "PDNG";
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}