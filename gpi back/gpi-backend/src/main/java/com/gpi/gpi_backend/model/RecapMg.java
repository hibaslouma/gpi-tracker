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

    @Column(name = "SENDER_NAME", length = 200)
    private String senderName;

    @Column(name = "SENDER_ADDRESS", length = 300)
    private String senderAddress;

    @Column(name = "SENDER_BIC", length = 20)
    private String senderBic;

    @Column(name = "RECEIVER_NAME", length = 200)
    private String receiverName;

    @Column(name = "RECEIVER_ADDRESS", length = 300)
    private String receiverAddress;

    @Column(name = "RECEIVER_BIC", length = 20)
    private String receiverBic;

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

    @PrePersist
    public void prePersist() {
        this.receivedAt = LocalDateTime.now();
    }
}