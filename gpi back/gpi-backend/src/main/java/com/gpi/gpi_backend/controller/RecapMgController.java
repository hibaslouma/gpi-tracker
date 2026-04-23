package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.model.RecapMg;
import com.gpi.gpi_backend.repository.RecapMgRepository;
import com.gpi.gpi_backend.service.Pacs002GeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backoffice")
@RequiredArgsConstructor
public class RecapMgController {

    private final RecapMgRepository recapMgRepository;
    private final Pacs002GeneratorService pacs002GeneratorService;

    @Value("${watcher.output-folder-path}")
    private String outputFolderPath;

    @Value("${watcher.folder-path}")
    private String inputFolderPath;

    @Value("${watcher.pacs002-folder-path}")
    private String pacs002FolderPath;

    // ── GET paiements ──────────────────────────────────────────
    @GetMapping("/paiements-recus")
    public ResponseEntity<List<RecapMg>> getPaiementsRecus() {
        return ResponseEntity.ok(recapMgRepository.findByTypeMsg("RECU"));
    }

    @GetMapping("/paiements-emis")
    public ResponseEntity<List<RecapMg>> getPaiementsEmis() {
        return ResponseEntity.ok(recapMgRepository.findByTypeMsg("EMIS"));
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
            return ResponseEntity.ok(Map.of("fileName", recap.getFileName(),
                    "content", Files.readString(archivePath)));
        } catch (IOException e) {
            return ResponseEntity.ok(Map.of("fileName", recap.getFileName(),
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
            return ResponseEntity.ok(Map.of("fileName", recap.getFileName(),
                    "content", Files.readString(archivePath)));
        } catch (IOException e) {
            return ResponseEntity.ok(Map.of("fileName", recap.getFileName(),
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
                .filter(r -> "ACSC".equals(r.getStatut()) || "ACCP".equals(r.getStatut())
                        || "ACSP".equals(r.getStatut())).count());
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

        // ✅ Generate pacs.002 → saved in pacs002 folder
        String generatedFileName = pacs002GeneratorService
                .genererPacs002AvecProwide(recap, nouveauStatut, motifRejet);

        // ✅ Read generated file and return as downloadable XML
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
            System.err.println("[RecapMgController] ❌ Erreur lecture pacs.002 : "
                    + e.getMessage());
            return ResponseEntity.ok().build();
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