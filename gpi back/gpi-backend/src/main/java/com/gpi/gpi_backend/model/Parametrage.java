package com.gpi.gpi_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "PARAMETRAGE")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Parametrage {

    @Id
    @Column(name = "ID")
    private Long id;

    @Column(name = "NOM_BANQUE")
    private String nomBanque;

    @Column(name = "BIC")
    private String bic;

    @Column(name = "PAYS")
    private String pays;

    @Column(name = "FUSEAU")
    private String fuseau;

    @Column(name = "ADRESSE")
    private String adresse;

    @Column(name = "TELEPHONE")
    private String telephone;

    @Column(name = "EMAIL")
    private String email;

    @Column(name = "SITE_WEB")
    private String siteWeb;

    @Column(name = "DOSSIER_RECU")
    private String dossierRecu;

    @Column(name = "DOSSIER_EMIS")
    private String dossierEmis;
}