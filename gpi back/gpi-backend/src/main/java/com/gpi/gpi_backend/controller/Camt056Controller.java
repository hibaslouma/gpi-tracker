package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.model.Camt056;
import com.gpi.gpi_backend.service.Camt056Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backoffice")
@RequiredArgsConstructor
public class Camt056Controller {

    private final Camt056Service camt056Service;

    // ── GET all camt.056 ───────────────────────────────────────
    @GetMapping("/camt056")
    public ResponseEntity<List<Camt056>> getAll() {
        return ResponseEntity.ok(camt056Service.getAll());
    }

    // ── POST send camt.056 ─────────────────────────────────────
    @PostMapping("/camt056")
    public ResponseEntity<?> envoyerCamt056(@RequestBody Map<String, String> body) {
        try {
            String originalMsgId = body.get("originalMsgId");
            String motif         = body.get("motif");
            String motifDetail   = body.get("motifDetail");

            if (originalMsgId == null || originalMsgId.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "originalMsgId est requis"));
            }

            Camt056 result = camt056Service.envoyerCamt056(
                    originalMsgId, motif, motifDetail);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}