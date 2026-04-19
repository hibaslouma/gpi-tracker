package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.model.Camt056;
import com.gpi.gpi_backend.model.RecapMg;
import com.gpi.gpi_backend.repository.Camt056Repository;
import com.gpi.gpi_backend.repository.RecapMgRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class Camt056Service {

    private final Camt056Repository camt056Repository;
    private final RecapMgRepository recapMgRepository;

    // ✅ Dedicated camt.056 output folder — not watched by FolderWatcher
    @Value("${watcher.camt056-folder-path}")
    private String camt056FolderPath;

    // ── GET ALL ────────────────────────────────────────────────
    public List<Camt056> getAll() {
        return camt056Repository.findAllByOrderByCreatedAtDesc();
    }

    // ── SEND camt.056 ──────────────────────────────────────────
    public Camt056 envoyerCamt056(String originalMsgId, String motif,
                                  String motifDetail) {
        // Find the original pacs.008
        Optional<RecapMg> recapOpt = recapMgRepository.findByMessageId(originalMsgId);
        if (recapOpt.isEmpty()) {
            throw new RuntimeException("Paiement introuvable: " + originalMsgId);
        }
        RecapMg recap = recapOpt.get();

        String timestamp = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String messageId = "CAMT056-" + recap.getMessageId() + "-" + timestamp;

        // ── Save to DB ─────────────────────────────────────────
        Camt056 camt056 = Camt056.builder()
                .messageId(messageId)
                .originalMsgId(originalMsgId)
                .uetr(recap.getUetr())
                .bicEmetteur(recap.getReceiverBic())
                .bicRecepteur(recap.getSenderBic())
                .motif(motif)
                .motifDetail(motifDetail)
                .statut("PDNG")
                .fileName(messageId + ".xml")
                .build();

        camt056Repository.save(camt056);

        // ── Generate camt.056 XML file ─────────────────────────
        genererFichierCamt056(camt056, recap);

        // ── Update pacs.008 statut to CANC ─────────────────────
        recap.setStatut("CANC");
        recapMgRepository.save(recap);

        System.out.println("[Camt056Service] ✅ camt.056 envoyé: " + messageId);
        return camt056;
    }

    // ── UPDATE statut from camt.029 response ───────────────────
    public void updateStatut(String uetr, String statut, String motifRefus) {
        camt056Repository.findByUetr(uetr).ifPresent(c -> {
            c.setStatut(statut);
            if (motifRefus != null) c.setMotifRefus(motifRefus);
            camt056Repository.save(c);
            System.out.println("[Camt056Service] ✅ Statut updated: "
                    + uetr + " → " + statut);
        });
    }

    // ── Generate XML file → camt056 folder ────────────────────
    private void genererFichierCamt056(Camt056 camt056, RecapMg recap) {
        try {
            // ✅ Save to dedicated camt056 folder, not client recu
            Path outputPath = Paths.get(camt056FolderPath);
            if (!Files.exists(outputPath)) Files.createDirectories(outputPath);

            String creDtTm = LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"));

            String xml =
                    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                            "<data>\n" +
                            "<AppHdr>\n" +
                            "  <Fr><FIId><FinInstnId><BICFI>" + camt056.getBicEmetteur() + "</BICFI></FinInstnId></FIId></Fr>\n" +
                            "  <To><FIId><FinInstnId><BICFI>" + camt056.getBicRecepteur() + "</BICFI></FinInstnId></FIId></To>\n" +
                            "  <BizMsgIdr>" + camt056.getMessageId() + "</BizMsgIdr>\n" +
                            "  <MsgDefIdr>camt.056.001.08</MsgDefIdr>\n" +
                            "  <CreDt>" + creDtTm + "</CreDt>\n" +
                            "</AppHdr>\n" +
                            "<Document xmlns=\"urn:iso:std:iso:20022:tech:xsd:camt.056.001.08\">\n" +
                            "  <FIToFIPmtCxlReq>\n" +
                            "    <Assgnmt>\n" +
                            "      <MsgId>" + camt056.getMessageId() + "</MsgId>\n" +
                            "      <CreDtTm>" + creDtTm + "</CreDtTm>\n" +
                            "      <Assgnr><Agt><FinInstnId><BICFI>" + camt056.getBicEmetteur() + "</BICFI></FinInstnId></Agt></Assgnr>\n" +
                            "      <Assgne><Agt><FinInstnId><BICFI>" + camt056.getBicRecepteur() + "</BICFI></FinInstnId></Agt></Assgne>\n" +
                            "    </Assgnmt>\n" +
                            "    <Undrlyg>\n" +
                            "      <TxInf>\n" +
                            "        <OrgnlGrpInf>\n" +
                            "          <OrgnlMsgId>" + camt056.getOriginalMsgId() + "</OrgnlMsgId>\n" +
                            "          <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>\n" +
                            "        </OrgnlGrpInf>\n" +
                            "        <OrgnlUETR>" + (camt056.getUetr() != null ? camt056.getUetr() : "") + "</OrgnlUETR>\n" +
                            "        <CxlRsnInf>\n" +
                            "          <Rsn><Cd>" + camt056.getMotif() + "</Cd></Rsn>\n" +
                            (camt056.getMotifDetail() != null && !camt056.getMotifDetail().isBlank() ?
                                    "          <AddtlInf>" + camt056.getMotifDetail() + "</AddtlInf>\n" : "") +
                            "        </CxlRsnInf>\n" +
                            "      </TxInf>\n" +
                            "    </Undrlyg>\n" +
                            "  </FIToFIPmtCxlReq>\n" +
                            "</Document>\n" +
                            "</data>";

            Path filePath = outputPath.resolve(camt056.getFileName());
            Files.writeString(filePath, xml);
            System.out.println("[Camt056Service] ✅ Fichier généré: "
                    + camt056FolderPath + "/" + camt056.getFileName());

        } catch (IOException e) {
            System.err.println("[Camt056Service] ❌ Erreur génération fichier: " + e.getMessage());
        }
    }
}