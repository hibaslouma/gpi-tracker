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

    @Column(name = "BIC", nullable = false, unique = true, length = 11)
    private String bic;

    @Column(name = "NOM_BANQUE", nullable = false, length = 100)
    private String nomBanque;

    @Column(name = "PAYS_CODE", length = 2)
    private String paysCode;

    @Column(name = "PAYS_NOM", length = 100)
    private String paysNom;

    @Column(name = "FLAG_URL")
    private String flagUrl;

    @Column(name = "TYPE_BANQUE", length = 50)
    private String typeBanque;

    @Column(name = "DEVISE", length = 200)
    private String devise;

    @Column(name = "CUT_OFF", length = 5)
    private String cutOff;

    @Column(name = "FUSEAU_HORAIRE", length = 30)
    private String fuseauHoraire;
}