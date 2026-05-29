package com.gpi.gpi_backend.dto;

import lombok.Data;

@Data
public class AiPredictionRequest {

    private String senderIban;
    private String receiverIban;

    private String senderBic;
    private String receiverBic;

    private Double amount;

    private String currency;

    private String msgType;
}