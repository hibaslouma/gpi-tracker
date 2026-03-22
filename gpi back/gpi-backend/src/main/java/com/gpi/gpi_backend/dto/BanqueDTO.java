package com.gpi.gpi_backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BanqueDTO {
    private Long id;
    private String bic;
    private String nomBanque;
    private String paysCode;
    private String paysNom;
    private String flagUrl;
    private String typeBanque;
    private String devise;
    private String cutOff;
    private String fuseauHoraire;
}