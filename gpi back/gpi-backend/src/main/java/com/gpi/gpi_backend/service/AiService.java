package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.dto.AiPredictionResponse;
import com.gpi.gpi_backend.model.RecapMg;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private final RestTemplate restTemplate;
    // RestTemplate = client HTTP Java

    @Value("${ai.api.url:http://localhost:5000/predict}")
    private String aiApiUrl;
    // L'URL de Flask configurée dans application.properties

    public AiPredictionResponse predict(RecapMg transaction) {
        try {
            // 1. Préparer les données à envoyer
            Map<String, Object> body = new HashMap<>();
            body.put("sender_iban",   nvl(transaction.getSenderIban()));
            body.put("receiver_iban", nvl(transaction.getReceiverIban()));
            body.put("sender_bic",    nvl(transaction.getSenderBic()));
            body.put("receiver_bic",  nvl(transaction.getReceiverBic()));
            body.put("amount",        transaction.getMontant() != null
                    ? transaction.getMontant().doubleValue() : 0.0);
            body.put("currency",      nvl(transaction.getDevise()));
            body.put("msg_type",      nvl(transaction.getMsgType(), "pacs.008"));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            // 3. Envoyer POST à Flask et recevoir la réponse
            ResponseEntity<AiPredictionResponse> response = restTemplate.postForEntity(
                    aiApiUrl, request, AiPredictionResponse.class
            );

            AiPredictionResponse result = response.getBody();
            log.info("[AiService]  Prédiction → status={} motif={} risk={}",
                    result.getStatus(), result.getRejectReason(), result.getRiskScore());
            return result;

        } catch (Exception e) {
            log.error("[AiService]  API IA indisponible : {}", e.getMessage());
            return null; // ← transaction sauvegardée normalement même si IA down
        }
    }

    private String nvl(String val) {
        return val != null ? val : "";
    }

    private String nvl(String val, String defaultVal) {
        return val != null && !val.isBlank() ? val : defaultVal;
    }
}