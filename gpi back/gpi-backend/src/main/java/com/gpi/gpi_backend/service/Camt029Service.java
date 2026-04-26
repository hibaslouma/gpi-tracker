package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.model.Camt056;
import com.prowidesoftware.swift.model.mx.MxCamt02900109;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
public class Camt029Service {

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

            StringBuilder sb = new StringBuilder();

            sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");

            sb.append("<AppHdr xmlns=\"urn:iso:std:iso:20022:tech:xsd:head.001.001.02\">\n");
            sb.append("  <Fr><FIId><FinInstnId><BICFI>").append(escapeXml(bicFrom)).append("</BICFI></FinInstnId></FIId></Fr>\n");
            sb.append("  <To><FIId><FinInstnId><BICFI>").append(escapeXml(bicTo)).append("</BICFI></FinInstnId></FIId></To>\n");
            sb.append("  <BizMsgIdr>").append(escapeXml(msgId)).append("</BizMsgIdr>\n");
            sb.append("  <MsgDefIdr>camt.029.001.09</MsgDefIdr>\n");
            sb.append("  <CreDt>").append(creDt).append("</CreDt>\n");
            sb.append("</AppHdr>\n");

            sb.append("<Document xmlns=\"urn:iso:std:iso:20022:tech:xsd:camt.029.001.09\">\n");
            sb.append("  <RsltnOfInvstgtn>\n");

            sb.append("    <Assgnmt>\n");
            sb.append("      <Id>").append(caseId).append("</Id>\n");
            sb.append("      <Assgnr><Agt><FinInstnId><BICFI>").append(escapeXml(bicFrom)).append("</BICFI></FinInstnId></Agt></Assgnr>\n");
            sb.append("      <Assgne><Agt><FinInstnId><BICFI>").append(escapeXml(bicTo)).append("</BICFI></FinInstnId></Agt></Assgne>\n");
            sb.append("      <CreDtTm>").append(creDt).append("</CreDtTm>\n");
            sb.append("    </Assgnmt>\n");

            sb.append("    <Sts>\n");
            sb.append("      <Conf>").append(conf).append("</Conf>\n");
            sb.append("    </Sts>\n");

            sb.append("    <CxlDtls>\n");
            sb.append("      <TxCxlSts>").append(txCxlSts).append("</TxCxlSts>\n");
            if ("RJCT".equals(txCxlSts)) {
                sb.append("      <StsRsnInf>\n");
                sb.append("        <Rsn><Cd>").append(escapeXml(nvl(motifRefus, "AGNT"))).append("</Cd></Rsn>\n");
                sb.append("      </StsRsnInf>\n");
            }
            sb.append("      <OrgnlGrpInf>\n");
            sb.append("        <OrgnlMsgId>").append(escapeXml(camt056.getOriginalMsgId())).append("</OrgnlMsgId>\n");
            sb.append("        <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>\n");
            sb.append("      </OrgnlGrpInf>\n");
            sb.append("      <OrgnlUETR>").append(escapeXml(camt056.getUetr())).append("</OrgnlUETR>\n");
            sb.append("    </CxlDtls>\n");

            sb.append("  </RsltnOfInvstgtn>\n");
            sb.append("</Document>");

            String prowideInput = sb.toString();

            MxCamt02900109 mx = MxCamt02900109.parse(prowideInput);
            String messageXml = mx.message();

            String body = messageXml.replaceFirst("<\\?xml[^?]*\\?>", "").trim();
            String finalXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<data>\n"
                    + body
                    + "\n</data>";

            Path outputPath = Paths.get(camt029FolderPath);
            if (!Files.exists(outputPath)) {
                Files.createDirectories(outputPath);
            }

            Files.writeString(outputPath.resolve(fileName), finalXml);

            System.out.println("[Camt029Service] ✅ camt.029 généré: " + fileName);
            System.out.println("[Camt029Service]    Decision    : " + normalizedDecision);
            System.out.println("[Camt029Service]    OrgnlMsgId  : " + camt056.getOriginalMsgId());
            System.out.println("[Camt029Service]    OrgnlUETR   : " + camt056.getUetr());

            return fileName;

        } catch (Exception e) {
            throw new RuntimeException("Erreur génération camt.029: " + e.getMessage(), e);
        }
    }

    private String normalizeDecision(String decision) {
        if ("ACCP".equalsIgnoreCase(decision)) {
            return "ACCP";
        }
        if ("RJCT".equalsIgnoreCase(decision)) {
            return "RJCT";
        }
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