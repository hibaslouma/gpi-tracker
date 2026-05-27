package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.model.RecapMg;
import com.prowidesoftware.swift.model.mx.MxPacs00200110;
import com.prowidesoftware.swift.model.mx.BusinessAppHdrV02;
import com.prowidesoftware.swift.model.mx.AppHdrFactory;
import com.prowidesoftware.swift.model.mx.dic.*;
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
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class Pacs002GeneratorService {

    @Value("${watcher.pacs002-folder-path}")
    private String pacs002FolderPath;

    private static final Pattern UUIDV4_PATTERN = Pattern.compile(
            "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
            Pattern.CASE_INSENSITIVE
    );

    private static final String PACS002_NAMESPACE =
            "urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10";

    /**
     * Generates a pacs.002.001.10 XML file using Prowide ISO 20022 SRU2024.
     * Validates UETR (UUIDv4) and XML structure (XSD) before writing.
     * Saves to C:/gpi-tracker/swift/pacs002/
     *
     * @return the generated file name (used by controller for download)
     */
    public String genererPacs002AvecProwide(RecapMg recap, String statut, String motifRejet) {
        try {
            // ── 1. Validate UETR (UUIDv4) ─────────────────────────
            ValidationResult uetrResult = validerUetr(recap.getUetr());
            if (!uetrResult.isValid()) {
                System.err.println("[Pacs002GeneratorService] ⚠️  UETR invalide : "
                        + uetrResult.getErrors());
                String newUetr = UUID.randomUUID().toString();
                System.out.println("[Pacs002GeneratorService]    UETR corrigé  : " + newUetr);
                recap.setUetr(newUetr);
            }

            // ── 2. Prepare output path → pacs002 folder ───────────
            Path outputPath = Paths.get(pacs002FolderPath);
            if (!Files.exists(outputPath)) Files.createDirectories(outputPath);

            String timestamp = LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String fileName = "pacs002_" + recap.getMessageId()
                    + "_" + statut + "_" + timestamp + ".xml";
            Path filePath = outputPath.resolve(fileName);

            String ackMsgId = "ACK-" + recap.getMessageId() + "-" + timestamp;
            String bicFrom  = recap.getReceiverBic() != null ? recap.getReceiverBic() : "BIATTNTT";
            String bicTo    = recap.getSenderBic()   != null ? recap.getSenderBic()   : "UNKNOWN";

            // ── 3. Create MxPacs00200110 ───────────────────────────
            MxPacs00200110 pacs002 = new MxPacs00200110();

            // ── 4. Build AppHdr using AppHdrFactory ────────────────
            BusinessAppHdrV02 appHdrV02 = (BusinessAppHdrV02) AppHdrFactory
                    .createBusinessAppHdrV02(bicFrom, bicTo, ackMsgId, pacs002.getMxId());
            pacs002.setAppHdr(appHdrV02);

            // ── 5. Build Document body ─────────────────────────────
            FIToFIPaymentStatusReportV10 doc = new FIToFIPaymentStatusReportV10();

            GroupHeader91 grpHdr = new GroupHeader91();
            grpHdr.setMsgId(ackMsgId);
            grpHdr.setCreDtTm(OffsetDateTime.now(ZoneOffset.UTC));
            doc.setGrpHdr(grpHdr);

            PaymentTransaction110 txInf = new PaymentTransaction110();

            OriginalGroupInformation29 orgnlGrpInf = new OriginalGroupInformation29();
            orgnlGrpInf.setOrgnlMsgId(recap.getMessageId());
            orgnlGrpInf.setOrgnlMsgNmId("pacs.008.001.08");
            txInf.setOrgnlGrpInf(orgnlGrpInf);

            if (recap.getUetr() != null && !recap.getUetr().isBlank()) {
                txInf.setOrgnlUETR(recap.getUetr());
            }

            txInf.setTxSts(statut);

            if ("RJCT".equals(statut) && motifRejet != null && !motifRejet.isBlank()) {
                StatusReasonInformation12 stsRsnInf = new StatusReasonInformation12();
                StatusReason6Choice rsn = new StatusReason6Choice();
                rsn.setCd(motifRejet);
                stsRsnInf.setRsn(rsn);
                txInf.getStsRsnInf().add(stsRsnInf);
            }

            doc.getTxInfAndSts().add(txInf);
            pacs002.setFIToFIPmtStsRpt(doc);

            // ── 6. Serialize to XML ────────────────────────────────
            String messageXml = pacs002.message();

            // ── 7. Validate XML against XSD ───────────────────────
            ValidationResult xsdResult = validerXsd(messageXml);
            if (!xsdResult.isValid()) {
                System.err.println("[Pacs002GeneratorService] ⚠️  Validation XSD échouée :");
                xsdResult.getErrors().forEach(e -> System.err.println("    - " + e));
            } else {
                System.out.println("[Pacs002GeneratorService] ✅ Validation XSD réussie");
            }

            // ── 8. Wrap in <data> and write file ───────────────────
            String docBody = messageXml.replaceFirst("<\\?xml[^?]*\\?>", "").trim();
            String fullXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                    + "<data>\n" + docBody + "\n</data>";

            Files.writeString(filePath, fullXml);

            System.out.println("[Pacs002GeneratorService] ✅ pacs.002 généré : " + fileName);
            System.out.println("[Pacs002GeneratorService]    Dossier    : " + pacs002FolderPath);
            System.out.println("[Pacs002GeneratorService]    OrgnlMsgId : " + recap.getMessageId());
            System.out.println("[Pacs002GeneratorService]    OrgnlUETR  : " + recap.getUetr());
            System.out.println("[Pacs002GeneratorService]    TxSts      : " + statut);
            System.out.println("[Pacs002GeneratorService]    De         : " + bicFrom);
            System.out.println("[Pacs002GeneratorService]    Vers       : " + bicTo);

            // ✅ Return filename so controller can serve it as download
            return fileName;

        } catch (IOException e) {
            System.err.println("[Pacs002GeneratorService] ❌ Erreur écriture : " + e.getMessage());
            throw new RuntimeException("Erreur écriture pacs.002", e);
        } catch (Exception e) {
            System.err.println("[Pacs002GeneratorService] ❌ Erreur Prowide : " + e.getMessage());
            throw new RuntimeException("Erreur Prowide pacs.002", e);
        }
    }

    // ── UETR UUIDv4 validation ─────────────────────────────────
    public ValidationResult validerUetr(String uetr) {
        List<String> errors = new ArrayList<>();
        if (uetr == null || uetr.isBlank()) {
            errors.add("UETR est null ou vide");
            return new ValidationResult(false, errors);
        }
        if (!UUIDV4_PATTERN.matcher(uetr).matches()) {
            errors.add("UETR '" + uetr + "' n'est pas un UUID v4 valide");
            errors.add("Format attendu : xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx");
        } else {
            String[] parts = uetr.split("-");
            if (!parts[2].startsWith("4")) {
                errors.add("La version UUID doit être 4 (UUIDv4)");
            }
            char v = Character.toLowerCase(parts[3].charAt(0));
            if (v != '8' && v != '9' && v != 'a' && v != 'b') {
                errors.add("Le variant UUID doit commencer par 8, 9, a ou b");
            }
        }
        boolean valid = errors.isEmpty();
        if (valid) {
            System.out.println("[Pacs002GeneratorService] ✅ UETR valide (UUIDv4) : " + uetr);
        }
        return new ValidationResult(valid, errors);
    }

    // ── XSD validation ─────────────────────────────────────────
    public ValidationResult validerXsd(String xmlContent) {
        List<String> errors = new ArrayList<>();
        try {
            SchemaFactory factory = SchemaFactory
                    .newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);

            var xsdUrl = MxPacs00200110.class.getResource("/schema/pacs.002.001.10.xsd");
            if (xsdUrl != null) {
                Schema schema = factory.newSchema(xsdUrl);
                Validator validator = schema.newValidator();
                String docOnly = extraireDocument(xmlContent);
                if (docOnly == null) {
                    errors.add("Impossible d'extraire le Document XML");
                    return new ValidationResult(false, errors);
                }
                validator.validate(new StreamSource(new StringReader(docOnly)));
                System.out.println("[Pacs002GeneratorService] ✅ Validation XSD complète réussie");
            } else {
                System.out.println("[Pacs002GeneratorService] ℹ️  XSD non trouvé, validation structurelle");
                return validerStructureBasique(xmlContent);
            }
        } catch (Exception e) {
            errors.add("Erreur XSD : " + e.getMessage());
        }
        return new ValidationResult(errors.isEmpty(), errors);
    }

    private String extraireDocument(String xml) {
        try {
            int start = xml.indexOf("<Document");
            int end   = xml.lastIndexOf("</Document>") + "</Document>".length();
            if (start < 0 || end < "</Document>".length()) return null;
            return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + xml.substring(start, end);
        } catch (Exception e) { return null; }
    }

    private ValidationResult validerStructureBasique(String xml) {
        List<String> errors = new ArrayList<>();
        String[] required = {
                "FIToFIPmtStsRpt", "GrpHdr", "MsgId", "CreDtTm",
                "TxInfAndSts", "OrgnlGrpInf", "OrgnlMsgId", "OrgnlMsgNmId", "TxSts"
        };
        for (String el : required) {
            if (!xml.contains("<" + el + ">") && !xml.contains("<pacs:" + el + ">")) {
                errors.add("Élément requis manquant : <" + el + ">");
            }
        }
        if (!xml.contains(PACS002_NAMESPACE)) {
            errors.add("Namespace pacs.002.001.10 manquant");
        }
        if (errors.isEmpty()) {
            System.out.println("[Pacs002GeneratorService] ✅ Validation structurelle réussie");
        }
        return new ValidationResult(errors.isEmpty(), errors);
    }

    public static class ValidationResult {
        private final boolean valid;
        private final List<String> errors;

        public ValidationResult(boolean valid, List<String> errors) {
            this.valid = valid; this.errors = errors;
        }

        public boolean isValid()        { return valid; }
        public List<String> getErrors() { return errors; }

        @Override
        public String toString() {
            return valid ? "✅ Valide" : "❌ Invalide: " + errors;
        }
    }
}