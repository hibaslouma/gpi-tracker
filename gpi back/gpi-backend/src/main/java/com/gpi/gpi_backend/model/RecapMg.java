package com.gpi.gpi_backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "RECAP_MG")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecapMg {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "MESSAGE_ID", length = 100)
    private String messageId;

    @Column(name = "UETR", length = 100)
    private String uetr;

    @Column(name = "TYPE_MSG", length = 10)
    private String typeMsg;

    // ✅ New: stores pacs.008 / pacs.009 / pacs.009.COV
    @Column(name = "MSG_TYPE", length = 20)
    private String msgType;

    @Column(name = "SENDER_NAME", length = 200)
    private String senderName;

    @Column(name = "SENDER_ADDRESS", length = 300)
    private String senderAddress;

    @Column(name = "SENDER_BIC", length = 20)
    private String senderBic;

    @Column(name = "RECEIVER_NAME", length = 200)
    private String receiverName;

    @Column(name = "SENDER_IBAN", length = 50)
    private String senderIban;

    @Column(name = "RECEIVER_ADDRESS", length = 300)
    private String receiverAddress;

    @Column(name = "RECEIVER_BIC", length = 20)
    private String receiverBic;

    @Column(name = "RECEIVER_IBAN", length = 50)
    private String receiverIban;

    @Column(name = "MONTANT", precision = 18, scale = 2)
    private BigDecimal montant;

    @Column(name = "DEVISE", length = 10)
    private String devise;

    @Column(name = "DATE_VALEUR")
    private LocalDate dateValeur;

    @Column(name = "FILE_NAME", length = 255)
    private String fileName;

    @Column(name = "RECEIVED_AT")
    private LocalDateTime receivedAt;

    @Column(name = "STATUT", length = 10)
    private String statut;

    @Column(name = "MOTIF_REJET", length = 10)
    private String motifRejet;

    @PrePersist
    public void prePersist() {
        this.receivedAt = LocalDateTime.now();
        if (this.statut == null) {
            this.statut = "PDNG";
        }
    }
}