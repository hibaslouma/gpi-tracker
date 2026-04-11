package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.model.RecapMg;
import com.gpi.gpi_backend.repository.RecapMgRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backoffice")
@RequiredArgsConstructor
public class RecapMgController {

    private final RecapMgRepository recapMgRepository;

    @Value("${watcher.output-folder-path}")
    private String outputFolderPath;

    @Value("${watcher.folder-path}")
    private String inputFolderPath;

    @GetMapping("/paiements-recus")
    public ResponseEntity<List<RecapMg>> getPaiementsRecus() {
        return ResponseEntity.ok(recapMgRepository.findByTypeMsg("RECU"));
    }

    @GetMapping("/paiements-emis")
    public ResponseEntity<List<RecapMg>> getPaiementsEmis() {
        return ResponseEntity.ok(recapMgRepository.findByTypeMsg("EMIS"));
    }

    // XML du pacs.008 emis
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
                    "content", "<!-- Fichier XML introuvable dans l archive -->"));
        }
        try {
            return ResponseEntity.ok(Map.of("fileName", recap.getFileName(), "content", Files.readString(archivePath)));
        } catch (IOException e) {
            return ResponseEntity.ok(Map.of("fileName", recap.getFileName(), "content", "<!-- Erreur: " + e.getMessage() + " -->"));
        }
    }

    // XML du pacs.008 recu
    @GetMapping("/paiements-recus/{id}/xml")
    public ResponseEntity<Map<String, String>> getPaiementRecuXml(@PathVariable Long id) {
        RecapMg recap = recapMgRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Paiement introuvable"));

        Path archivePath = Paths.get(inputFolderPath).resolve("archive").resolve(recap.getFileName());
        if (!Files.exists(archivePath)) {
            return ResponseEntity.ok(Map.of(
                    "fileName", recap.getFileName() != null ? recap.getFileName() : "inconnu",
                    "content", "<!-- Fichier XML introuvable dans l archive -->"));
        }
        try {
            return ResponseEntity.ok(Map.of("fileName", recap.getFileName(), "content", Files.readString(archivePath)));
        } catch (IOException e) {
            return ResponseEntity.ok(Map.of("fileName", recap.getFileName(), "content", "<!-- Erreur: " + e.getMessage() + " -->"));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        Map<String, Long> stats = new HashMap<>();
        List<RecapMg> recus = recapMgRepository.findByTypeMsg("RECU");
        stats.put("totalRecus", (long) recus.size());
        stats.put("enAttente", recus.stream().filter(r -> "PDNG".equals(r.getStatut())).count());
        stats.put("acceptes", recus.stream().filter(r -> "ACSC".equals(r.getStatut()) || "ACCP".equals(r.getStatut()) || "ACSP".equals(r.getStatut())).count());
        stats.put("rejetes", recus.stream().filter(r -> "RJCT".equals(r.getStatut())).count());
        List<RecapMg> emis = recapMgRepository.findByTypeMsg("EMIS");
        stats.put("totalEmis", (long) emis.size());
        stats.put("emisEnAttente", emis.stream().filter(r -> "PDNG".equals(r.getStatut())).count());
        stats.put("emisAcceptes", emis.stream().filter(r -> "ACSC".equals(r.getStatut())).count());
        stats.put("emisRejetes", emis.stream().filter(r -> "RJCT".equals(r.getStatut())).count());
        return ResponseEntity.ok(stats);
    }

    @PatchMapping("/paiements-recus/{id}/statut")
    public ResponseEntity<RecapMg> updateStatut(@PathVariable Long id, @RequestBody Map<String, String> body) {
        RecapMg recap = recapMgRepository.findById(id).orElseThrow(() -> new RuntimeException("Paiement introuvable"));
        recap.setStatut(body.get("statut"));
        if (body.get("motifRejet") != null) recap.setMotifRejet(body.get("motifRejet"));
        recapMgRepository.save(recap);
        genererPacs002(recap, body.get("statut"), body.get("motifRejet"));
        return ResponseEntity.ok(recap);
    }

    private void genererPacs002(RecapMg recap, String statut, String motifRejet) {
        try {
            Path outputPath = Paths.get(outputFolderPath);
            if (!Files.exists(outputPath)) Files.createDirectories(outputPath);
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String fileName = "pacs002_" + recap.getMessageId() + "_" + statut + "_" + timestamp + ".xml";
            String motifXml = (motifRejet != null && !motifRejet.isEmpty()) ? "      <StsRsnInf><Rsn><Cd>" + motifRejet + "</Cd></Rsn></StsRsnInf>\n" : "";
            String uetrXml = (recap.getUetr() != null && !recap.getUetr().isEmpty()) ? "      <OrgnlUETR>" + recap.getUetr() + "</OrgnlUETR>\n" : "";
            String bicFrom = recap.getReceiverBic() != null ? recap.getReceiverBic() : "BIATTNTT";
            String bicTo = recap.getSenderBic() != null ? recap.getSenderBic() : "UNKNOWN";
            String creDtTm = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            String xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<data>\n<AppHdr>\n  <Fr><FIId><FinInstnId><BICFI>" + bicFrom + "</BICFI></FinInstnId></FIId></Fr>\n  <To><FIId><FinInstnId><BICFI>" + bicTo + "</BICFI></FinInstnId></FIId></To>\n  <BizMsgIdr>ACK-" + recap.getMessageId() + "-" + timestamp + "</BizMsgIdr>\n  <MsgDefIdr>pacs.002.001.10</MsgDefIdr>\n  <CreDt>" + creDtTm + "</CreDt>\n</AppHdr>\n<Document xmlns=\"urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10\">\n  <FIToFIPmtStsRpt>\n    <GrpHdr>\n      <MsgId>ACK-" + recap.getMessageId() + "-" + timestamp + "</MsgId>\n      <CreDtTm>" + creDtTm + "</CreDtTm>\n    </GrpHdr>\n    <TxInfAndSts>\n      <OrgnlMsgId>" + recap.getMessageId() + "</OrgnlMsgId>\n      <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>\n" + uetrXml + motifXml + "      <TxSts>" + statut + "</TxSts>\n    </TxInfAndSts>\n  </FIToFIPmtStsRpt>\n</Document>\n</data>\n";
            Files.writeString(outputPath.resolve(fileName), xml);
            System.out.println("[RecapMgController] pacs.002 genere : " + fileName);
        } catch (IOException e) {
            System.err.println("[RecapMgController] Erreur generation pacs.002 : " + e.getMessage());
        }
    }

    @GetMapping("/historique")
    public ResponseEntity<List<Map<String, Object>>> getHistorique() {
        List<RecapMg> tous = recapMgRepository.findAll();
        List<Map<String, Object>> historique = new ArrayList<>();
        for (RecapMg r : tous) {
            Map<String, Object> pacs008 = new HashMap<>();
            pacs008.put("type", "pacs.008");
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
}