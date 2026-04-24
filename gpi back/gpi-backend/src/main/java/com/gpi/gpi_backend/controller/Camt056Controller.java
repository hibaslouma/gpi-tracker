package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.model.Camt056;
import com.gpi.gpi_backend.service.Camt056Service;
import com.gpi.gpi_backend.service.Camt029GeneratorService;
import com.gpi.gpi_backend.repository.Camt056Repository;
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
    private final Camt056Repository camt056Repository;
    private final Camt029GeneratorService camt029GeneratorService;

    // ── GET all camt.056 ───────────────────────────────────────
    @GetMapping("/camt056")
    public ResponseEntity<List<Camt056>> getAll() {
        return ResponseEntity.ok(camt056Service.getAll());
    }

    // ── POST send camt.056 (demande annulation) ────────────────
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

    // ✅ POST respond to incoming camt.056 (réponse annulation)
    // Called by frontend: repondreCamt056(id, 'ACCP'/'RJCT', motifRefus?)
    @PostMapping("/camt056/{id}/repondre")
    public ResponseEntity<?> repondreCamt056(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            String decision   = body.getOrDefault("decision", "ACCP");
            String motifRefus = body.get("motifRefus");

            // Find camt.056 by id
            Camt056 camt056 = camt056Repository.findById(id)
                    .orElseThrow(() -> new RuntimeException(
                            "camt.056 introuvable pour id: " + id));

            // Only PDNG camt.056 can be responded to
            if (!"PDNG".equals(camt056.getStatut())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error",
                                "Ce camt.056 a déjà été traité (statut: " + camt056.getStatut() + ")"));
            }

            // ✅ Generate camt.029 response
            String fileName = camt029GeneratorService.genererCamt029AvecProwide(
                    camt056, decision, motifRefus);

            // ✅ Update camt.056 statut
            camt056.setStatut("ACCP".equals(decision) ? "ACCP" : "RJCT");
            if (motifRefus != null && !motifRefus.isBlank()) {
                camt056.setMotifRefus(motifRefus);
            }
            camt056Repository.save(camt056);

            // ✅ If accepted, update the original pacs.008 RECU statut to CANC
            if ("ACCP".equals(decision)) {
                camt056Service.annulerPaiementRecu(camt056.getOriginalMsgId());
            }

            return ResponseEntity.ok(Map.of(
                    "message", "camt.029 généré",
                    "fileName", fileName,
                    "decision", decision,
                    "camt056Id", id
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}