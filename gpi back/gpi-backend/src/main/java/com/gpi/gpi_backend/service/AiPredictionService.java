package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.dto.AiPredictionRequest;
import com.gpi.gpi_backend.dto.AiPredictionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiPredictionService {

    private final RestTemplate restTemplate;

    private static final String AI_URL = "http://localhost:5000/predict";

    public AiPredictionResponse predict(AiPredictionRequest request) {

        Map<String, Object> body = new HashMap<>();

        body.put("sender_iban", request.getSenderIban());
        body.put("receiver_iban", request.getReceiverIban());

        body.put("sender_bic", request.getSenderBic());
        body.put("receiver_bic", request.getReceiverBic());

        body.put("amount", request.getAmount());

        body.put("currency", request.getCurrency());

        body.put("msg_type", request.getMsgType());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity =
                new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                AI_URL,
                HttpMethod.POST,
                entity,
                Map.class
        );

        Map<String, Object> data = response.getBody();

        AiPredictionResponse result = new AiPredictionResponse();

        if (data == null) {
            throw new RuntimeException("AI service returned empty response");
        }

        result.setPrediction(
                data.get("prediction") != null
                        ? data.get("prediction").toString()
                        : "UNKNOWN"
        );

        Object probability = data.get("probability");

        if (probability instanceof Number number) {
            result.setProbability(number.doubleValue());
        } else {
            result.setProbability(0.0);
        }

        result.setReason(
                data.get("reason") != null
                        ? data.get("reason").toString()
                        : "No reason provided"
        );

        Object reasons = data.get("top_reasons");

        if (reasons instanceof List<?>) {

            List<String> topReasons = ((List<?>) reasons)
                    .stream()
                    .map(Object::toString)
                    .toList();

            result.setTopReasons(topReasons);
        }

        return result;
    }
}