package com.gpi.gpi_backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "BANQUES")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Banque {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "banque_seq")
    @SequenceGenerator(name = "banque_seq", sequenceName = "BANQUE_SEQ", allocationSize = 1)
    private Long id;

    @Column(name = "PARTICIPANT", nullable = false)
    private String participant;

    @Column(name = "NOM_BANQUE", nullable = false)
    private String nomBanque;

    @Column(name = "PAYS_CODE")
    private String paysCode;

    @Column(name = "PAYS_NOM")
    private String paysNom;

    @Column(name = "FLAG_URL")
    private String flagUrl;

    @Column(name = "BIC", nullable = false)
    private String bic;

    @Column(name = "DEVISES")
    private String devises;

    @Column(name = "STATUT")
    private String statut; // "ACTIF" ou "INACTIF"

    @Column(name = "CUT_OFF")
    private String cutOff;

    @Column(name = "RESEAU")
    private String reseau;
}