package com.gpi.gpi_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class AiPredictionResponse {

    @JsonProperty("status")
    private String status;

    @JsonProperty("reject_reason")
    private String rejectReason;

    @JsonProperty("risk_score")
    private Double riskScore;

    @JsonProperty("confidence")
    private String confidence;

    @JsonProperty("shap_explanation")
    private List<Map<String, Object>> shapExplanation;

    @JsonProperty("processing_time_ms")
    private Long processingTimeMs;
}