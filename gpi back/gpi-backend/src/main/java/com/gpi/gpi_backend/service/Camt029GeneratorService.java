package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.model.Camt056;
import com.prowidesoftware.swift.model.mx.MxCamt02900109;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class Camt029GeneratorService {

    @Value("${watcher.camt029-folder-path}")
    private String camt029FolderPath;

    public String genererCamt029AvecProwide(Camt056 camt056, String decision, String motifRefus) {
        try {
            String normalizedDecision = normalizeDecision(decision);

            String timestamp = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")
                    .format(OffsetDateTime.now(ZoneOffset.UTC));

            String msgId = "CAMT029-" + camt056.getOriginalMsgId() + "-" + timestamp;
            String caseId = UUID.randomUUID().toString();
            String fileName = msgId + ".xml";

            String bicFrom = nvl(camt056.getBicRecepteur(), "UNKNOWN");
            String bicTo = nvl(camt056.getBicEmetteur(), "UNKNOWN");
            String creDt = OffsetDateTime.now(ZoneOffset.UTC).toString();

            String conf = "ACCP".equals(normalizedDecision) ? "ACCP" : "RJCR";
            String txCxlSts = "ACCP".equals(normalizedDecision) ? "ACCP" : "RJCT";

            StringBuilder documentOnly = new StringBuilder();

            documentOnly.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            documentOnly.append("<Document xmlns=\"urn:iso:std:iso:20022:tech:xsd:camt.029.001.09\">\n");
            documentOnly.append("  <RsltnOfInvstgtn>\n");

            documentOnly.append("    <Assgnmt>\n");
            documentOnly.append("      <Id>").append(escapeXml(caseId)).append("</Id>\n");
            documentOnly.append("      <Assgnr><Agt><FinInstnId><BICFI>").append(escapeXml(bicFrom)).append("</BICFI></FinInstnId></Agt></Assgnr>\n");
            documentOnly.append("      <Assgne><Agt><FinInstnId><BICFI>").append(escapeXml(bicTo)).append("</BICFI></FinInstnId></Agt></Assgne>\n");
            documentOnly.append("      <CreDtTm>").append(creDt).append("</CreDtTm>\n");
            documentOnly.append("    </Assgnmt>\n");

            documentOnly.append("    <Sts>\n");
            documentOnly.append("      <Conf>").append(conf).append("</Conf>\n");
            documentOnly.append("    </Sts>\n");

            documentOnly.append("    <CxlDtls>\n");
            documentOnly.append("      <TxCxlSts>").append(txCxlSts).append("</TxCxlSts>\n");

            if ("RJCT".equals(txCxlSts)) {
                documentOnly.append("      <StsRsnInf>\n");
                documentOnly.append("        <Rsn><Cd>").append(escapeXml(nvl(motifRefus, "AGNT"))).append("</Cd></Rsn>\n");
                documentOnly.append("      </StsRsnInf>\n");
            }

            documentOnly.append("      <OrgnlGrpInf>\n");
            documentOnly.append("        <OrgnlMsgId>").append(escapeXml(camt056.getOriginalMsgId())).append("</OrgnlMsgId>\n");
            documentOnly.append("        <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>\n");
            documentOnly.append("      </OrgnlGrpInf>\n");

            if (camt056.getUetr() != null && !camt056.getUetr().isBlank()) {
                documentOnly.append("      <OrgnlUETR>").append(escapeXml(camt056.getUetr())).append("</OrgnlUETR>\n");
            }

            documentOnly.append("    </CxlDtls>\n");
            documentOnly.append("  </RsltnOfInvstgtn>\n");
            documentOnly.append("</Document>");

            MxCamt02900109 mx = MxCamt02900109.parse(documentOnly.toString());

            if (mx == null) {
                throw new RuntimeException("Prowide parse returned null for camt.029");
            }

            String parsedDocument = mx.message()
                    .replaceFirst("<\\?xml[^?]*\\?>", "")
                    .trim();

            StringBuilder finalXml = new StringBuilder();

            finalXml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            finalXml.append("<data>\n");

            finalXml.append("<AppHdr xmlns=\"urn:iso:std:iso:20022:tech:xsd:head.001.001.02\">\n");
            finalXml.append("  <Fr><FIId><FinInstnId><BICFI>").append(escapeXml(bicFrom)).append("</BICFI></FinInstnId></FIId></Fr>\n");
            finalXml.append("  <To><FIId><FinInstnId><BICFI>").append(escapeXml(bicTo)).append("</BICFI></FinInstnId></FIId></To>\n");
            finalXml.append("  <BizMsgIdr>").append(escapeXml(msgId)).append("</BizMsgIdr>\n");
            finalXml.append("  <MsgDefIdr>camt.029.001.09</MsgDefIdr>\n");
            finalXml.append("  <CreDt>").append(creDt).append("</CreDt>\n");
            finalXml.append("</AppHdr>\n");

            finalXml.append(parsedDocument).append("\n");
            finalXml.append("</data>");

            Path outputPath = Paths.get(camt029FolderPath);
            if (!Files.exists(outputPath)) {
                Files.createDirectories(outputPath);
            }

            Files.writeString(outputPath.resolve(fileName), finalXml.toString());

            System.out.println("[Camt029GeneratorService] ✅ camt.029 généré: " + fileName);
            return fileName;

        } catch (Exception e) {
            throw new RuntimeException("Erreur génération camt.029: " + e.getMessage(), e);
        }
    }

    private String normalizeDecision(String decision) {
        if ("ACCP".equalsIgnoreCase(decision)) return "ACCP";
        if ("RJCT".equalsIgnoreCase(decision)) return "RJCT";
        throw new RuntimeException("Decision invalide. Utilisez ACCP ou RJCT");
    }

    private String nvl(String value, String fallback) {
        return value != null && !value.isBlank() ? value : fallback;
    }

    private String escapeXml(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}