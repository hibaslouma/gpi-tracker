package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.model.Camt056;
import com.gpi.gpi_backend.repository.Camt056Repository;
import com.gpi.gpi_backend.service.Camt029GeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/backoffice")
@RequiredArgsConstructor
public class Camt029Controller {

    private final Camt029GeneratorService camt029GeneratorService;
    private final Camt056Repository camt056Repository;

    @PostMapping("/camt029")
    public ResponseEntity<?> genererCamt029(@RequestBody Map<String, String> body) {
        try {
            String uetr = body.get("uetr");
            String decision = body.getOrDefault("decision", "ACCP");
            String motifRefus = body.get("motifRefus");

            if (uetr == null || uetr.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "uetr est requis"));
            }

            Camt056 camt056 = camt056Repository.findTopByUetrOrderByCreatedAtDesc(uetr)
                    .orElseThrow(() ->
                            new RuntimeException("camt.056 introuvable pour UETR: " + uetr));

            String fileName = camt029GeneratorService.genererCamt029AvecProwide(
                    camt056,
                    decision,
                    motifRefus
            );

            return ResponseEntity.ok(Map.of(
                    "message", "camt.029 généré",
                    "fileName", fileName,
                    "uetr", uetr,
                    "decision", decision
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}