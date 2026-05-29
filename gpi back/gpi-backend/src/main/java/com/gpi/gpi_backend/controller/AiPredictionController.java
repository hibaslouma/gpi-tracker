package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.dto.AiPredictionRequest;
import com.gpi.gpi_backend.dto.AiPredictionResponse;
import com.gpi.gpi_backend.service.AiPredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin("*")
public class AiPredictionController {

    private final AiPredictionService aiPredictionService;

    @PostMapping("/predict")
    public ResponseEntity<AiPredictionResponse> predict(
            @RequestBody AiPredictionRequest request
    ) {
        return ResponseEntity.ok(aiPredictionService.predict(request));
    }
}