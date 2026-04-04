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

    // ✅ Récupérer tous les paiements reçus
    @GetMapping("/paiements-recus")
    public ResponseEntity<List<RecapMg>> getPaiementsRecus() {
        return ResponseEntity.ok(recapMgRepository.findAll());
    }

    // ✅ Stats pour le dashboard
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("totalRecus", recapMgRepository.count());
        stats.put("enAttente", recapMgRepository.countByStatut("PDNG"));
        stats.put("acceptes", recapMgRepository.countByStatut("ACSC"));
        stats.put("rejetes", recapMgRepository.countByStatut("RJCT"));
        return ResponseEntity.ok(stats);
    }

    // ✅ Accepter ou rejeter un paiement
    @PatchMapping("/paiements-recus/{id}/statut")
    public ResponseEntity<RecapMg> updateStatut(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        RecapMg recap = recapMgRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Paiement introuvable"));

        String nouveauStatut = body.get("statut");
        String motifRejet = body.get("motifRejet");

        recap.setStatut(nouveauStatut);
        if (motifRejet != null) {
            recap.setMotifRejet(motifRejet);
        }

        recapMgRepository.save(recap);

        // ✅ Générer pacs.002
        genererPacs002(recap, nouveauStatut, motifRejet);

        return ResponseEntity.ok(recap);
    }

    // ✅ Générer fichier pacs.002
    private void genererPacs002(RecapMg recap, String statut, String motifRejet) {
        try {
            Path outputPath = Paths.get(outputFolderPath);
            if (!Files.exists(outputPath)) {
                Files.createDirectories(outputPath);
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String fileName = "pacs002_" + recap.getMessageId() + "_" + statut + "_" + timestamp + ".xml";
            Path filePath = outputPath.resolve(fileName);

            String motifXml = (motifRejet != null && !motifRejet.isEmpty())
                    ? "<StsRsnInf><Rsn><Cd>" + motifRejet + "</Cd></Rsn></StsRsnInf>"
                    : "";

            String xml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10">
                  <FIToFIPmtStsRpt>
                    <GrpHdr>
                      <MsgId>ACK-%s-%s</MsgId>
                      <CreDtTm>%s</CreDtTm>
                    </GrpHdr>
                    <TxInfAndSts>
                      <OrgnlMsgId>%s</OrgnlMsgId>
                      <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>
                      <TxSts>%s</TxSts>
                      %s
                    </TxInfAndSts>
                  </FIToFIPmtStsRpt>
                </Document>
                """.formatted(
                    recap.getMessageId(),
                    timestamp,
                    LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                    recap.getMessageId(),
                    statut,
                    motifXml
            );

            Files.writeString(filePath, xml);
            System.out.println("✅ pacs.002 généré : " + fileName);

        } catch (IOException e) {
            System.err.println("❌ Erreur génération pacs.002 : " + e.getMessage());
        }
    }
    @GetMapping("/historique")
    public ResponseEntity<List<Map<String, Object>>> getHistorique() {
        List<RecapMg> tous = recapMgRepository.findAll();
        List<Map<String, Object>> historique = new ArrayList<>();

        for (RecapMg r : tous) {
            // ✅ pacs.008 reçu
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
            historique.add(pacs008);

            // ✅ pacs.002 généré si traité
            if (r.getStatut() != null && !r.getStatut().equals("PDNG")) {
                Map<String, Object> pacs002 = new HashMap<>();
                pacs002.put("type", "pacs.002");
                pacs002.put("messageId", "ACK-" + r.getMessageId());
                pacs002.put("senderBic", r.getReceiverBic());
                pacs002.put("receiverBic", r.getSenderBic());
                pacs002.put("montant", r.getMontant());
                pacs002.put("devise", r.getDevise());
                pacs002.put("statut", r.getStatut());
                pacs002.put("date", r.getReceivedAt());
                pacs002.put("motifRejet", r.getMotifRejet());
                historique.add(pacs002);
            }
        }

        return ResponseEntity.ok(historique);
    }
}