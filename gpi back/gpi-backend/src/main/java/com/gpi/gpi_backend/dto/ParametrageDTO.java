package com.gpi.gpi_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParametrageDTO {

    // Banque
    private String nomBanque;
    private String bic;
    private String pays;
    private String fuseau;
    private String adresse;
    private String telephone;
    private String email;
    private String siteWeb;

    // SLA
    private Integer delaiConfirmation;
    private Integer delaiAlerte;
    private Integer delaiRecall;

    // Devises
    private String devisesActives;
    private String deviseDefaut;

    // XML — lecture seule
    private String dossierRecu;
    private String dossierEmis;
}