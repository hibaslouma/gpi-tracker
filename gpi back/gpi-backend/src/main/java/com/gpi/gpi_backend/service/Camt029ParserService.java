package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.model.RecapMg;
import com.gpi.gpi_backend.repository.RecapMgRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.xpath.*;
import java.nio.file.Path;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class Camt029ParserService {

    private final RecapMgRepository recapMgRepository;

    public void parsingCamt029(Path file) {
        System.out.println("[Camt029Parser] 🔍 Parsing camt.029: " + file.getFileName());

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(file.toFile());
            doc.getDocumentElement().normalize();

            XPath xpath = XPathFactory.newInstance().newXPath();

            String orgnlMsgId = extractFirst(xpath, doc, "//*[local-name()='OrgnlMsgId']");
            String orgnlUetr  = extractFirst(xpath, doc, "//*[local-name()='OrgnlUETR']");
            String cxlSts     = extractFirst(xpath, doc, "//*[local-name()='CxlSts']");
            String rjctRsn    = extractFirst(xpath, doc,
                    "//*[local-name()='StsRsnInf']/*[local-name()='Rsn']/*[local-name()='Cd']");

            System.out.println("[Camt029Parser] OrgnlMsgId : " + orgnlMsgId);
            System.out.println("[Camt029Parser] OrgnlUETR  : " + orgnlUetr);
            System.out.println("[Camt029Parser] CxlSts     : " + cxlSts);
            System.out.println("[Camt029Parser] RjctRsn    : " + rjctRsn);

            if ((orgnlUetr == null || orgnlUetr.isBlank()) &&
                    (orgnlMsgId == null || orgnlMsgId.isBlank())) {
                System.err.println("[Camt029Parser] ⚠️ Aucune référence trouvée");
                return;
            }

            Optional<RecapMg> recapOpt = Optional.empty();

            if (orgnlUetr != null && !orgnlUetr.isBlank()) {
                recapOpt = recapMgRepository.findByUetr(orgnlUetr);
            }

            if (recapOpt.isEmpty() && orgnlMsgId != null && !orgnlMsgId.isBlank()) {
                recapOpt = recapMgRepository.findByMessageId(orgnlMsgId);
            }

            if (recapOpt.isEmpty()) {
                System.err.println("[Camt029Parser] ⚠️ RecapMg introuvable");
                return;
            }

            RecapMg recap = recapOpt.get();
            String statut = mapCamt029Status(cxlSts);

            recap.setStatut(statut);

            if ("RJCT".equals(statut) && rjctRsn != null && !rjctRsn.isBlank()) {
                recap.setMotifRejet(rjctRsn);
            }

            recapMgRepository.save(recap);

            System.out.println("[Camt029Parser] ✅ RecapMg mis à jour: "
                    + recap.getMessageId() + " → " + statut);

        } catch (Exception e) {
            System.err.println("[Camt029Parser] ❌ Error: "
                    + file.getFileName() + " → " + e.getMessage());
            throw new RuntimeException("Camt029 parsing failed: " + e.getMessage(), e);
        }
    }

    private String mapCamt029Status(String cxlSts) {
        if (cxlSts == null) return "PDNG";
        return switch (cxlSts.toUpperCase()) {
            case "ACCP", "ACCW" -> "CANC";
            case "RJCT"         -> "RJCT";
            default             -> "PDNG";
        };
    }

    private String extractFirst(XPath xpath, Document doc, String expression) {
        try {
            NodeList nodes = (NodeList) xpath.evaluate(
                    expression, doc, XPathConstants.NODESET);
            if (nodes != null && nodes.getLength() > 0) {
                String val = nodes.item(0).getTextContent();
                return val != null && !val.isBlank() ? val.trim() : null;
            }
        } catch (Exception e) {
            System.err.println("[Camt029Parser] ⚠️ XPath error: " + expression);
        }
        return null;
    }
}