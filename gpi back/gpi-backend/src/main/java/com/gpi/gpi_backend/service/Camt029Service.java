package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.model.RecapMg;
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
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class Camt029Service {

    private final RecapMgRepository recapMgRepository;

    @Value("${watcher.camt029-folder-path}")
    private String camt029FolderPath;

    private static final Pattern UUIDV4_PATTERN = Pattern.compile(
            "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
            Pattern.CASE_INSENSITIVE
    );

    private static final String CAMT029_NAMESPACE =
            "urn:iso:std:iso:20022:tech:xsd:camt.029.001.09";

    public String genererCamt029AvecProwide(String uetr) {
        try {
            Optional<RecapMg> recapOpt = recapMgRepository.findByUetr(uetr);
            if (recapOpt.isEmpty()) {
                throw new RuntimeException("Paiement introuvable pour UETR: " + uetr);
            }

            RecapMg recap = recapOpt.get();

            if (!"RECU".equalsIgnoreCase(recap.getTypeMsg())) {
                throw new RuntimeException("Le camt.029 doit être généré pour un paiement entrant (RECU)");
            }

            if (!"pacs.009".equalsIgnoreCase(recap.getMsgType())
                    && !"pacs.009.COV".equalsIgnoreCase(recap.getMsgType())) {
                throw new RuntimeException("Le camt.029 est réservé aux pacs.009 entrants");
            }

            ValidationResult uetrResult = validerUetr(recap.getUetr());
            if (!uetrResult.isValid()) {
                String newUetr = UUID.randomUUID().toString();
                System.out.println("[Camt029Service] ⚠️ UETR invalide, remplacé par: " + newUetr);
                recap.setUetr(newUetr);
                recapMgRepository.save(recap);
            }

            Path outputPath = Paths.get(camt029FolderPath);
            if (!Files.exists(outputPath)) {
                Files.createDirectories(outputPath);
            }

            String timestamp = LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

            String msgId = "CAMT029-" + recap.getMessageId() + "-" + timestamp;
            String caseId = UUID.randomUUID().toString();
            String fileName = msgId + ".xml";

            String bicFrom = nvl(recap.getReceiverBic(), "BIATTNTT");
            String bicTo   = nvl(recap.getSenderBic(), "UNKNOWN");
            String creDtTm = LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"));

            StringBuilder sb = new StringBuilder();
            sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            sb.append("<data>\n");

            sb.append("<AppHdr xmlns=\"urn:iso:std:iso:20022:tech:xsd:head.001.001.02\">\n");
            sb.append("  <Fr><FIId><FinInstnId><BICFI>").append(bicFrom).append("</BICFI></FinInstnId></FIId></Fr>\n");
            sb.append("  <To><FIId><FinInstnId><BICFI>").append(bicTo).append("</BICFI></FinInstnId></FIId></To>\n");
            sb.append("  <BizMsgIdr>").append(msgId).append("</BizMsgIdr>\n");
            sb.append("  <MsgDefIdr>camt.029.001.09</MsgDefIdr>\n");
            sb.append("  <CreDt>").append(creDtTm).append("</CreDt>\n");
            sb.append("</AppHdr>\n");

            sb.append("<Document xmlns=\"").append(CAMT029_NAMESPACE).append("\">\n");
            sb.append("  <RsltnOfInvstgtn>\n");

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

            sb.append("    <Case>\n");
            sb.append("      <Id>").append(caseId).append("</Id>\n");
            sb.append("    </Case>\n");

            sb.append("    <Sts>\n");
            sb.append("      <Conf>RJCR</Conf>\n");
            sb.append("    </Sts>\n");

            sb.append("    <CxlDtls>\n");
            sb.append("      <CxlSts>RJCT</CxlSts>\n");
            sb.append("      <StsRsnInf>\n");
            sb.append("        <Rsn><Cd>AGNT</Cd></Rsn>\n");
            sb.append("      </StsRsnInf>\n");
            sb.append("    </CxlDtls>\n");

            sb.append("    <Undrlyg>\n");
            sb.append("      <TxInf>\n");
            sb.append("        <OrgnlGrpInf>\n");
            sb.append("          <OrgnlMsgId>").append(recap.getMessageId()).append("</OrgnlMsgId>\n");
            sb.append("          <OrgnlMsgNmId>").append(nvl(recap.getMsgType(), "pacs.009.001.08")).append("</OrgnlMsgNmId>\n");
            sb.append("        </OrgnlGrpInf>\n");

            if (recap.getUetr() != null && !recap.getUetr().isBlank()) {
                sb.append("        <OrgnlUETR>").append(recap.getUetr()).append("</OrgnlUETR>\n");
            }

            sb.append("      </TxInf>\n");
            sb.append("    </Undrlyg>\n");

            sb.append("  </RsltnOfInvstgtn>\n");
            sb.append("</Document>\n");
            sb.append("</data>");

            String fullXml = sb.toString();

            ValidationResult xsdResult = validerXsd(fullXml);
            if (!xsdResult.isValid()) {
                System.err.println("[Camt029Service] ⚠️ Validation XSD échouée:");
                xsdResult.getErrors().forEach(e -> System.err.println("   - " + e));
            } else {
                System.out.println("[Camt029Service] ✅ Validation XSD réussie");
            }

            Files.writeString(outputPath.resolve(fileName), fullXml);

            recap.setStatut("RJCT");
            recap.setMotifRejet("AGNT");
            recapMgRepository.save(recap);

            System.out.println("[Camt029Service] ✅ camt.029 généré: " + fileName);
            System.out.println("[Camt029Service]    OrgnlMsgId : " + recap.getMessageId());
            System.out.println("[Camt029Service]    OrgnlUETR  : " + recap.getUetr());
            System.out.println("[Camt029Service]    Statut MAJ : RJCT");

            return fileName;

        } catch (IOException e) {
            throw new RuntimeException("Erreur écriture camt.029", e);
        } catch (Exception e) {
            throw new RuntimeException("Erreur génération camt.029: " + e.getMessage(), e);
        }
    }

    public ValidationResult validerUetr(String uetr) {
        List<String> errors = new ArrayList<>();
        if (uetr == null || uetr.isBlank()) {
            errors.add("UETR est null ou vide");
            return new ValidationResult(false, errors);
        }
        if (!UUIDV4_PATTERN.matcher(uetr).matches()) {
            errors.add("UETR '" + uetr + "' n'est pas un UUID v4 valide");
        }
        return new ValidationResult(errors.isEmpty(), errors);
    }

    public ValidationResult validerXsd(String xmlContent) {
        List<String> errors = new ArrayList<>();
        try {
            var xsdUrl = getClass().getResource("/schema/camt.029.001.09.xsd");
            if (xsdUrl != null) {
                SchemaFactory factory = SchemaFactory
                        .newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
                factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
                Schema schema = factory.newSchema(xsdUrl);
                Validator validator = schema.newValidator();

                String docOnly = extraireDocument(xmlContent);
                if (docOnly == null) {
                    errors.add("Impossible d'extraire le Document XML");
                    return new ValidationResult(false, errors);
                }

                validator.validate(new StreamSource(new StringReader(docOnly)));
                System.out.println("[Camt029Service] ✅ Validation XSD complète réussie");
            } else {
                System.out.println("[Camt029Service] ℹ️ XSD non trouvé, validation structurelle");
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
            int end = xml.lastIndexOf("</Document>") + "</Document>".length();
            if (start < 0 || end < "</Document>".length()) return null;
            return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + xml.substring(start, end);
        } catch (Exception e) {
            return null;
        }
    }

    private ValidationResult validerStructureBasique(String xml) {
        List<String> errors = new ArrayList<>();
        String[] required = {
                "RsltnOfInvstgtn", "Assgnmt", "Id", "Assgnr", "Assgne", "CreDtTm",
                "Case", "Sts", "CxlDtls", "CxlSts", "Undrlyg", "TxInf",
                "OrgnlGrpInf", "OrgnlMsgId", "OrgnlMsgNmId"
        };
        for (String el : required) {
            if (!xml.contains("<" + el + ">") && !xml.contains("<" + el + " ")) {
                errors.add("Élément requis manquant : <" + el + ">");
            }
        }
        if (!xml.contains(CAMT029_NAMESPACE)) {
            errors.add("Namespace camt.029.001.09 manquant");
        }
        return new ValidationResult(errors.isEmpty(), errors);
    }

    private String nvl(String s, String def) {
        return (s != null && !s.isBlank()) ? s : def;
    }

    public static class ValidationResult {
        private final boolean valid;
        private final List<String> errors;

        public ValidationResult(boolean valid, List<String> errors) {
            this.valid = valid;
            this.errors = errors;
        }

        public boolean isValid() {
            return valid;
        }

        public List<String> getErrors() {
            return errors;
        }
    }
}