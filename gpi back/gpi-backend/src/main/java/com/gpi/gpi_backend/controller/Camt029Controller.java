package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.service.Camt029Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/backoffice")
@RequiredArgsConstructor
public class Camt029Controller {

    private final Camt029Service camt029Service;

    @PostMapping("/camt029")
    public ResponseEntity<?> genererCamt029(@RequestBody Map<String, String> body) {
        try {
            String uetr = body.get("uetr");

            if (uetr == null || uetr.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "uetr est requis"));
            }

            String fileName = camt029Service.genererCamt029AvecProwide(uetr);

            return ResponseEntity.ok(Map.of(
                    "message", "camt.029 généré avec succès",
                    "fileName", fileName,
                    "uetr", uetr
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}