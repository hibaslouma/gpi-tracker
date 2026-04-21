package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.model.Camt056;
import com.gpi.gpi_backend.model.RecapMg;
import com.gpi.gpi_backend.repository.Camt056Repository;
import com.gpi.gpi_backend.repository.RecapMgRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.xml.XMLConstants;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import java.io.IOException;
import java.io.StringReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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

    // ── SEND camt.056 ──────────────────────────────────────────
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
        String messageId  = "CAMT056-" + recap.getMessageId() + "-" + timestamp;
        // ✅ Unique Case ID for the whole lifecycle (UUID per spec)
        String caseId     = UUID.randomUUID().toString();

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
        genererXml(camt056, recap, caseId);

        recap.setStatut("CANC");
        recapMgRepository.save(recap);

        System.out.println("[Camt056Service] ✅ camt.056 envoyé: " + messageId);
        return camt056;
    }

    // ── UPDATE statut from camt.029 ────────────────────────────
    public void updateStatut(String uetr, String statut, String motifRefus) {
        camt056Repository.findByUetr(uetr).ifPresent(c -> {
            c.setStatut(statut);
            if (motifRefus != null) c.setMotifRefus(motifRefus);
            camt056Repository.save(c);
            System.out.println("[Camt056Service] ✅ Statut: " + uetr + " → " + statut);
        });
    }

    // ── Generate XML (ISO 20022 compliant per BNY spec doc) ───
    private void genererXml(Camt056 camt056, RecapMg recap, String caseId) {
        try {
            Path outputPath = Paths.get(camt056FolderPath);
            if (!Files.exists(outputPath)) Files.createDirectories(outputPath);

            String bicFrom = nvl(camt056.getBicEmetteur(),  "BIATTNTT");
            String bicTo   = nvl(camt056.getBicRecepteur(), "UNKNOWN");
            String creDtTm = LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"));

            // ── AppHdr (ISO 20022 head.001.001.02) ────────────
            StringBuilder sb = new StringBuilder();
            sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            sb.append("<data>\n");

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

            // ── Assignment block (mandatory per spec) ─────────
            // Contains: Id (case ID), Assgnr, Assgne, CreDtTm
            sb.append("    <Assgnmt>\n");
            sb.append("      <Id>").append(caseId).append("</Id>\n");
            sb.append("      <Assgnr>\n");
            sb.append("        <Agt><FinInstnId><BICFI>").append(bicFrom).append("</BICFI></FinInstnId></Agt>\n");
            sb.append("      </Assgnr>\n");
            sb.append("      <Assgne>\n");
            sb.append("        <Agt><FinInstnId><BICFI>").append(bicTo).append("</BICFI></FinInstnId></Agt>\n");
            sb.append("      </Assgne>\n");
            sb.append("      <CreDtTm>").append(creDtTm).append("</CreDtTm>\n");
            sb.append("    </Assgnmt>\n");

            // ── Underlying block (mandatory per spec) ─────────
            // Contains: TxInf → OrgnlGrpInf, OrgnlUETR, CxlRsnInf
            sb.append("    <Undrlyg>\n");
            sb.append("      <TxInf>\n");

            // Original Group Info
            sb.append("        <OrgnlGrpInf>\n");
            sb.append("          <OrgnlMsgId>").append(camt056.getOriginalMsgId()).append("</OrgnlMsgId>\n");
            sb.append("          <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>\n");
            sb.append("        </OrgnlGrpInf>\n");

            // ✅ Original UETR — mandatory per BNY spec
            if (recap.getUetr() != null && !recap.getUetr().isBlank()) {
                sb.append("        <OrgnlUETR>").append(recap.getUetr()).append("</OrgnlUETR>\n");
            }

            // ✅ Cancellation Reason Info — mandatory per spec
            // Reason codes from spec: DUPL, FRAD, UPAY, CUST, TECH, CUTA, COVR, CURR, AGNT, AM09, NARR
            sb.append("        <CxlRsnInf>\n");
            sb.append("          <Rsn><Cd>").append(nvl(camt056.getMotif(), "NARR")).append("</Cd></Rsn>\n");
            if (camt056.getMotifDetail() != null && !camt056.getMotifDetail().isBlank()) {
                sb.append("          <AddtlInf>").append(escapeXml(camt056.getMotifDetail())).append("</AddtlInf>\n");
            }
            sb.append("        </CxlRsnInf>\n");

            sb.append("      </TxInf>\n");
            sb.append("    </Undrlyg>\n");
            sb.append("  </FIToFIPmtCxlReq>\n");
            sb.append("</Document>\n");
            sb.append("</data>");

            String fullXml = sb.toString();

            // ── XSD Validation ─────────────────────────────────
            ValidationResult result = validerXsd(fullXml);
            if (!result.isValid()) {
                result.getErrors().forEach(e ->
                        System.err.println("[Camt056Service] ⚠️ XSD: " + e));
            } else {
                System.out.println("[Camt056Service] ✅ XSD OK");
            }

            // ── Write file ─────────────────────────────────────
            Files.writeString(outputPath.resolve(camt056.getFileName()), fullXml);

            System.out.println("[Camt056Service] ✅ Fichier généré: " + camt056.getFileName());
            System.out.println("[Camt056Service]    CaseId     : " + caseId);
            System.out.println("[Camt056Service]    Assgnr     : " + bicFrom);
            System.out.println("[Camt056Service]    Assgne     : " + bicTo);
            System.out.println("[Camt056Service]    OrgnlMsgId : " + camt056.getOriginalMsgId());
            System.out.println("[Camt056Service]    OrgnlUETR  : " + recap.getUetr());
            System.out.println("[Camt056Service]    Motif      : " + camt056.getMotif());

        } catch (IOException e) {
            throw new RuntimeException("Erreur écriture camt.056", e);
        }
    }

    // ── XSD Validation ─────────────────────────────────────────
    public ValidationResult validerXsd(String xmlContent) {
        List<String> errors = new ArrayList<>();
        try {
            // Try to find XSD in classpath
            var xsdUrl = getClass().getResource("/schema/camt.056.001.08.xsd");
            if (xsdUrl != null) {
                SchemaFactory factory = SchemaFactory
                        .newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
                factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
                Schema schema = factory.newSchema(xsdUrl);
                Validator validator = schema.newValidator();
                String docOnly = extraireDocument(xmlContent);
                if (docOnly == null) {
                    errors.add("Impossible d'extraire Document");
                    return new ValidationResult(false, errors);
                }
                validator.validate(new StreamSource(new StringReader(docOnly)));
                System.out.println("[Camt056Service] ✅ XSD complet réussi");
            } else {
                // Fallback: structural check
                System.out.println("[Camt056Service] ℹ️ XSD non trouvé — validation structurelle");
                return validerStructureBasique(xmlContent);
            }
        } catch (Exception e) {
            errors.add("Erreur XSD: " + e.getMessage());
        }
        return new ValidationResult(errors.isEmpty(), errors);
    }

    private String extraireDocument(String xml) {
        try {
            int start = xml.indexOf("<Document");
            int end   = xml.lastIndexOf("</Document>") + "</Document>".length();
            if (start < 0 || end < 11) return null;
            return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + xml.substring(start, end);
        } catch (Exception e) { return null; }
    }

    private ValidationResult validerStructureBasique(String xml) {
        List<String> errors = new ArrayList<>();
        // Mandatory elements per BNY spec doc
        for (String el : new String[]{
                "FIToFIPmtCxlReq", "Assgnmt", "Id", "Assgnr", "Assgne", "CreDtTm",
                "Undrlyg", "TxInf", "OrgnlGrpInf", "OrgnlMsgId", "OrgnlMsgNmId", "CxlRsnInf"
        }) {
            if (!xml.contains("<" + el + ">") && !xml.contains("<" + el + " ")) {
                errors.add("Élément requis manquant: <" + el + ">");
            }
        }
        if (!xml.contains(CAMT056_NAMESPACE)) {
            errors.add("Namespace camt.056.001.08 manquant");
        }
        if (errors.isEmpty()) {
            System.out.println("[Camt056Service] ✅ Validation structurelle OK");
        }
        return new ValidationResult(errors.isEmpty(), errors);
    }

    private String nvl(String s, String def) {
        return (s != null && !s.isBlank()) ? s : def;
    }

    private String escapeXml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;");
    }

    public static class ValidationResult {
        private final boolean valid;
        private final List<String> errors;
        public ValidationResult(boolean v, List<String> e) { valid = v; errors = e; }
        public boolean isValid() { return valid; }
        public List<String> getErrors() { return errors; }
    }
}