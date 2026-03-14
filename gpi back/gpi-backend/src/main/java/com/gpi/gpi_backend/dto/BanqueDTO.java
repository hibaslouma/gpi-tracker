package com.gpi.gpi_backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BanqueDTO {
    private Long id;
    private String participant;
    private String nomBanque;
    private String paysCode;
    private String paysNom;
    private String flagUrl;
    private String bic;
    private String devises;
    private String statut;
    private String cutOff;
    private String reseau;
}