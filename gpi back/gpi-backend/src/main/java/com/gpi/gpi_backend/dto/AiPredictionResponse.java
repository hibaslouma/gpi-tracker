package com.gpi.gpi_backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class AiPredictionResponse {

    private String prediction;

    private Double probability;

    private String reason;

    private List<String> topReasons;
}