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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class Camt056Service {

    private final Camt056Repository camt056Repository;
    private final RecapMgRepository recapMgRepository;

    @Value("${watcher.camt056-folder-path}")
    private String camt056FolderPath;

    private static final String CAMT056_NAMESPACE =
            "urn:iso:std:iso:20022:tech:xsd:camt.056.001.08";

    // ── GET ALL ────────────────────────────────────────────────
    public List<Camt056> getAll() {
        return camt056Repository.findAllByOrderByCreatedAtDesc();
    }

    // ── SEND camt.056 (demande annulation for EMIS pacs) ──────
    public Camt056 envoyerCamt056(String originalMsgId, String motif,
                                  String motifDetail) {
        Optional<RecapMg> recapOpt = recapMgRepository.findByMessageId(originalMsgId);
        if (recapOpt.isEmpty()) {
            throw new RuntimeException("Paiement introuvable: " + originalMsgId);
        }
        RecapMg recap = recapOpt.get();

        if (!"EMIS".equals(recap.getTypeMsg())) {
            throw new RuntimeException(
                    "Le camt.056 ne peut être envoyé que pour des paiements EMIS. "
                            + "Ce paiement est: " + recap.getTypeMsg());
        }

        String timestamp = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String messageId = "CAMT056-" + recap.getMessageId() + "-" + timestamp;

        Camt056 camt056 = Camt056.builder()
                .messageId(messageId)
                .originalMsgId(originalMsgId)
                .uetr(recap.getUetr())
                .bicEmetteur(recap.getSenderBic())
                .bicRecepteur(recap.getReceiverBic())
                .motif(motif)
                .motifDetail(motifDetail)
                .statut("PDNG")
                .fileName(messageId + ".xml")
                .build();

        camt056Repository.save(camt056);
        genererXml(camt056, recap);

        recap.setStatut("CANC");
        recapMgRepository.save(recap);

        System.out.println("[Camt056Service] ✅ camt.056 envoyé: " + messageId);
        return camt056;
    }

    // ✅ Update statut from incoming camt.029 (response to our camt.056)
    public void updateStatut(String uetr, String statut, String motifRefus) {
        camt056Repository.findByUetr(uetr).ifPresent(c -> {
            c.setStatut(statut);
            if (motifRefus != null) c.setMotifRefus(motifRefus);
            camt056Repository.save(c);
            System.out.println("[Camt056Service] ✅ Statut: " + uetr + " → " + statut);
        });
    }

    // ✅ Cancel the RECU pacs.008 when we accept an incoming camt.056
    public void annulerPaiementRecu(String originalMsgId) {
        recapMgRepository.findByMessageId(originalMsgId).ifPresent(recap -> {
            recap.setStatut("CANC");
            recapMgRepository.save(recap);
            System.out.println("[Camt056Service] ✅ pacs.008 RECU annulé: " + originalMsgId);
        });
    }

    // ── Generate XML ───────────────────────────────────────────
    private void genererXml(Camt056 camt056, RecapMg recap) {
        try {
            Path outputPath = Paths.get(camt056FolderPath);
            if (!Files.exists(outputPath)) Files.createDirectories(outputPath);

            String bicFrom = nvl(camt056.getBicEmetteur(), "BIATTNTT");
            String bicTo   = nvl(camt056.getBicRecepteur(), "UNKNOWN");
            String creDtTm = LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"));
            String caseId  = UUID.randomUUID().toString();

            StringBuilder sb = new StringBuilder();
            sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<data>\n");

            // AppHdr
            sb.append("<AppHdr xmlns=\"urn:iso:std:iso:20022:tech:xsd:head.001.001.02\">\n");
            sb.append("  <Fr><FIId><FinInstnId><BICFI>").append(bicFrom).append("</BICFI></FinInstnId></FIId></Fr>\n");
            sb.append("  <To><FIId><FinInstnId><BICFI>").append(bicTo).append("</BICFI></FinInstnId></FIId></To>\n");
            sb.append("  <BizMsgIdr>").append(camt056.getMessageId()).append("</BizMsgIdr>\n");
            sb.append("  <MsgDefIdr>camt.056.001.08</MsgDefIdr>\n");
            sb.append("  <CreDt>").append(creDtTm).append("</CreDt>\n");
            sb.append("</AppHdr>\n");

            // Document
            sb.append("<Document xmlns=\"").append(CAMT056_NAMESPACE).append("\">\n");
            sb.append("  <FIToFIPmtCxlReq>\n");

            // Assignment
            sb.append("    <Assgnmt>\n");
            sb.append("      <Id>").append(caseId).append("</Id>\n");
            sb.append("      <Assgnr><Agt><FinInstnId><BICFI>").append(bicFrom).append("</BICFI></FinInstnId></Agt></Assgnr>\n");
            sb.append("      <Assgne><Agt><FinInstnId><BICFI>").append(bicTo).append("</BICFI></FinInstnId></Agt></Assgne>\n");
            sb.append("      <CreDtTm>").append(creDtTm).append("</CreDtTm>\n");
            sb.append("    </Assgnmt>\n");

            // Underlying
            sb.append("    <Undrlyg>\n");
            sb.append("      <TxInf>\n");
            sb.append("        <OrgnlGrpInf>\n");
            sb.append("          <OrgnlMsgId>").append(camt056.getOriginalMsgId()).append("</OrgnlMsgId>\n");
            sb.append("          <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>\n");
            sb.append("        </OrgnlGrpInf>\n");
            if (recap.getUetr() != null && !recap.getUetr().isBlank()) {
                sb.append("        <OrgnlUETR>").append(recap.getUetr()).append("</OrgnlUETR>\n");
            }
            // Cancellation reason
            sb.append("        <CxlRsnInf>\n");
            sb.append("          <Rsn><Cd>").append(nvl(camt056.getMotif(), "NARR")).append("</Cd></Rsn>\n");
            if (camt056.getMotifDetail() != null && !camt056.getMotifDetail().isBlank()) {
                sb.append("          <AddtlInf>").append(escapeXml(camt056.getMotifDetail())).append("</AddtlInf>\n");
            }
            sb.append("        </CxlRsnInf>\n");
            sb.append("      </TxInf>\n");
            sb.append("    </Undrlyg>\n");
            sb.append("  </FIToFIPmtCxlReq>\n");
            sb.append("</Document>\n</data>");

            Files.writeString(outputPath.resolve(camt056.getFileName()), sb.toString());
            System.out.println("[Camt056Service] ✅ Fichier: " + camt056.getFileName());

        } catch (IOException e) {
            throw new RuntimeException("Erreur écriture camt.056", e);
        }
    }

    private String nvl(String s, String def) {
        return (s != null && !s.isBlank()) ? s : def;
    }

    private String escapeXml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;");
    }
}