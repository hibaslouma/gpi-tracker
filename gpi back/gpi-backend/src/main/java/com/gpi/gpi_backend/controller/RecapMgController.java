package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.model.RecapMg;
import com.gpi.gpi_backend.model.User;
import com.gpi.gpi_backend.repository.RecapMgRepository;
import com.gpi.gpi_backend.service.Pacs002GeneratorService;
import com.gpi.gpi_backend.service.UserProvisioningService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.gpi.gpi_backend.dto.AiPredictionResponse;
import com.gpi.gpi_backend.service.AiService;
import java.util.*;

@RestController
@RequestMapping("/api/backoffice")
@RequiredArgsConstructor
public class RecapMgController {

    private final RecapMgRepository recapMgRepository;
    private final Pacs002GeneratorService pacs002GeneratorService;
    private final AiService aiService;
    private final UserProvisioningService userProvisioningService;

    @Value("${watcher.output-folder-path}")
    private String outputFolderPath;

    @Value("${watcher.folder-path}")
    private String inputFolderPath;

    @Value("${watcher.pacs002-folder-path}")
    private String pacs002FolderPath;

    // ── GET paiements (backoffice – all) ──────────────────────────
    @GetMapping("/paiements-recus")
    public ResponseEntity<List<RecapMg>> getPaiementsRecus() {
        return ResponseEntity.ok(recapMgRepository.findByTypeMsg("RECU"));
    }

    @GetMapping("/paiements-emis")
    public ResponseEntity<List<RecapMg>> getPaiementsEmis() {
        return ResponseEntity.ok(recapMgRepository.findByTypeMsg("EMIS"));
    }

    // ── NEW: GET paiements for logged-in client (filtered by IBAN) ─────────

    /**
     * Client incoming payments.
     * typeMsg = 'RECU' and receiverIban = user's IBAN
     */
    @GetMapping("/client/paiements-recus")
    public ResponseEntity<List<RecapMg>> getClientPaiementsRecus(@AuthenticationPrincipal Jwt jwt) {

        User user = userProvisioningService.ensureUserFromJwt(jwt);
        String iban = user.getIban();

        if (iban == null || iban.isBlank()) {
            // No IBAN set for this local user → no client-specific transactions
            return ResponseEntity.ok(List.of());
        }

        List<RecapMg> list = recapMgRepository.findByTypeMsgAndReceiverIban("RECU", iban);
        return ResponseEntity.ok(list);
    }

    /**
     * Client outgoing payments.
     * typeMsg = 'EMIS' and senderIban = user's IBAN
     */
    @GetMapping("/client/paiements-emis")
    public ResponseEntity<List<RecapMg>> getClientPaiementsEmis(@AuthenticationPrincipal Jwt jwt) {

        User user = userProvisioningService.ensureUserFromJwt(jwt);
        String iban = user.getIban();

        if (iban == null || iban.isBlank()) {
            return ResponseEntity.ok(List.of());
        }

        List<RecapMg> list = recapMgRepository.findByTypeMsgAndSenderIban("EMIS", iban);
        return ResponseEntity.ok(list);
    }

    // ── GET XML files ──────────────────────────────────────────
    @GetMapping("/paiements-emis/{id}/xml")
    public ResponseEntity<Map<String, String>> getPaiementEmisXml(@PathVariable Long id) {
        RecapMg recap = recapMgRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Paiement introuvable"));

        Path archivePath = Paths.get(outputFolderPath).resolve("archive").resolve(recap.getFileName());
        if (!Files.exists(archivePath)) {
            archivePath = Paths.get(inputFolderPath).resolve("archive").resolve(recap.getFileName());
        }
        if (!Files.exists(archivePath)) {
            return ResponseEntity.ok(Map.of(
                    "fileName", recap.getFileName() != null ? recap.getFileName() : "inconnu",
                    "content", "<!-- Fichier XML introuvable dans l'archive -->"));
        }
        try {
            return ResponseEntity.ok(Map.of(
                    "fileName", recap.getFileName(),
                    "content", Files.readString(archivePath)));
        } catch (IOException e) {
            return ResponseEntity.ok(Map.of(
                    "fileName", recap.getFileName(),
                    "content", "<!-- Erreur lecture: " + e.getMessage() + " -->"));
        }
    }

    @GetMapping("/paiements-recus/{id}/xml")
    public ResponseEntity<Map<String, String>> getPaiementRecuXml(@PathVariable Long id) {
        RecapMg recap = recapMgRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Paiement introuvable"));

        Path archivePath = Paths.get(inputFolderPath).resolve("archive").resolve(recap.getFileName());
        if (!Files.exists(archivePath)) {
            return ResponseEntity.ok(Map.of(
                    "fileName", recap.getFileName() != null ? recap.getFileName() : "inconnu",
                    "content", "<!-- Fichier XML introuvable dans l'archive -->"));
        }
        try {
            return ResponseEntity.ok(Map.of(
                    "fileName", recap.getFileName(),
                    "content", Files.readString(archivePath)));
        } catch (IOException e) {
            return ResponseEntity.ok(Map.of(
                    "fileName", recap.getFileName(),
                    "content", "<!-- Erreur lecture: " + e.getMessage() + " -->"));
        }
    }

    // ── Stats ──────────────────────────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        Map<String, Long> stats = new HashMap<>();

        List<RecapMg> recus = recapMgRepository.findByTypeMsg("RECU");
        stats.put("totalRecus", (long) recus.size());
        stats.put("enAttente", recus.stream().filter(r -> "PDNG".equals(r.getStatut())).count());
        stats.put("acceptes", recus.stream()
                .filter(r -> "ACSC".equals(r.getStatut())
                        || "ACCP".equals(r.getStatut())
                        || "ACSP".equals(r.getStatut()))
                .count());
        stats.put("rejetes", recus.stream().filter(r -> "RJCT".equals(r.getStatut())).count());

        List<RecapMg> emis = recapMgRepository.findByTypeMsg("EMIS");
        stats.put("totalEmis", (long) emis.size());
        stats.put("emisEnAttente", emis.stream().filter(r -> "PDNG".equals(r.getStatut())).count());
        stats.put("emisAcceptes", emis.stream().filter(r -> "ACSC".equals(r.getStatut())).count());
        stats.put("emisRejetes", emis.stream().filter(r -> "RJCT".equals(r.getStatut())).count());

        return ResponseEntity.ok(stats);
    }

    // ── Update statut + generate pacs.002 + return as download ─
    @PatchMapping("/paiements-recus/{id}/statut")
    public ResponseEntity<Resource> updateStatut(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        RecapMg recap = recapMgRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Paiement introuvable"));

        String nouveauStatut = body.get("statut");
        String motifRejet    = body.get("motifRejet");

        recap.setStatut(nouveauStatut);
        if (motifRejet != null) recap.setMotifRejet(motifRejet);
        recapMgRepository.save(recap);

        // Generate pacs.002
        String generatedFileName = pacs002GeneratorService
                .genererPacs002AvecProwide(recap, nouveauStatut, motifRejet);

        // Read generated file and return as downloadable XML
        try {
            Path filePath = Paths.get(pacs002FolderPath).resolve(generatedFileName);
            byte[] fileContent = Files.readAllBytes(filePath);

            ByteArrayResource resource = new ByteArrayResource(fileContent);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + generatedFileName + "\"")
                    .contentType(MediaType.APPLICATION_XML)
                    .contentLength(fileContent.length)
                    .body(resource);

        } catch (IOException e) {
            System.err.println("[RecapMgController]  Erreur lecture pacs.002 : "
                    + e.getMessage());
            return ResponseEntity.ok().build();
        }
    }
    @GetMapping("/paiements/{id}/ai-prediction")
    public ResponseEntity<Map<String, Object>> getAiPrediction(@PathVariable Long id) {
        RecapMg recap = recapMgRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Paiement introuvable"));

        // Appel Flask pour SHAP frais
        try {
            AiPredictionResponse prediction = aiService.predict(recap);
            Map<String, Object> result = new HashMap<>();
            result.put("status",           prediction.getStatus());
            result.put("reject_reason",    prediction.getRejectReason());
            result.put("risk_score",       prediction.getRiskScore());
            result.put("confidence",       prediction.getConfidence());
            result.put("shap_explanation", prediction.getShapExplanation());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            // Retourner les données stockées si Flask est down
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("status",        recap.getAiStatus());
            fallback.put("reject_reason", recap.getAiRejectReason());
            fallback.put("risk_score",    recap.getAiRiskScore());
            fallback.put("confidence",    recap.getAiConfidence());
            fallback.put("shap_explanation", List.of());
            return ResponseEntity.ok(fallback);
        }
    }

    // ── Historique (pacs.008 + pacs.002) ──────────────────────
    @GetMapping("/historique")
    public ResponseEntity<List<Map<String, Object>>> getHistorique() {
        List<RecapMg> tous = recapMgRepository.findAll();
        List<Map<String, Object>> historique = new ArrayList<>();

        for (RecapMg r : tous) {
            Map<String, Object> pacs008 = new HashMap<>();
            pacs008.put("type", r.getMsgType() != null ? r.getMsgType() : "pacs.008");
            pacs008.put("messageId", r.getMessageId());
            pacs008.put("senderBic", r.getSenderBic());
            pacs008.put("receiverBic", r.getReceiverBic());
            pacs008.put("montant", r.getMontant());
            pacs008.put("devise", r.getDevise());
            pacs008.put("statut", r.getStatut() != null ? r.getStatut() : "PDNG");
            pacs008.put("date", r.getReceivedAt());
            pacs008.put("fileName", r.getFileName());
            pacs008.put("direction", r.getTypeMsg());
            historique.add(pacs008);

            if (r.getStatut() != null && !r.getStatut().equals("PDNG")) {
                Map<String, Object> pacs002 = new HashMap<>();
                pacs002.put("type", "pacs.002");
                pacs002.put("messageId", "ACK-" + r.getMessageId());
                pacs002.put("senderBic", "RECU".equals(r.getTypeMsg()) ? r.getReceiverBic() : r.getSenderBic());
                pacs002.put("receiverBic", "RECU".equals(r.getTypeMsg()) ? r.getSenderBic() : r.getReceiverBic());
                pacs002.put("montant", r.getMontant());
                pacs002.put("devise", r.getDevise());
                pacs002.put("statut", r.getStatut());
                pacs002.put("date", r.getReceivedAt());
                pacs002.put("motifRejet", r.getMotifRejet());
                pacs002.put("direction", "RECU".equals(r.getTypeMsg()) ? "EMIS" : "RECU");
                historique.add(pacs002);
            }
        }

        return ResponseEntity.ok(historique);
    }
    @GetMapping("/historique-pacs")
    public ResponseEntity<List<RecapMg>> getHistoriquePacs() {
        List<RecapMg> tous = recapMgRepository.findAll();
        List<RecapMg> pacsOnly = tous.stream()
                .filter(r -> r.getMsgType() == null
                        || r.getMsgType().startsWith("pacs.008")
                        || r.getMsgType().startsWith("pacs.009"))
                .sorted((a, b) -> {
                    if (a.getReceivedAt() == null) return 1;
                    if (b.getReceivedAt() == null) return -1;
                    return b.getReceivedAt().compareTo(a.getReceivedAt());
                })
                .toList();
        return ResponseEntity.ok(pacsOnly);
    }
}