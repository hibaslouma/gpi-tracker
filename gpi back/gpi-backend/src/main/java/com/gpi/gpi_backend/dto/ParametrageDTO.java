package com.gpi.gpi_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParametrageDTO {

    private String nomBanque;
    private String bic;
    private String pays;
    private String fuseau;
    private String adresse;
    private String telephone;
    private String email;
    private String siteWeb;
    private String dossierRecu;
    private String dossierEmis;
}