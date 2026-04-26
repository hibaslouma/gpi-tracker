package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.model.Camt056;
import com.gpi.gpi_backend.repository.Camt056Repository;
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

    private final Camt056Repository camt056Repository;

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
            String orgnlUetr = extractFirst(xpath, doc, "//*[local-name()='OrgnlUETR']");

            String cxlSts = extractFirst(xpath, doc, "//*[local-name()='TxCxlSts']");
            if (cxlSts == null) {
                cxlSts = extractFirst(xpath, doc, "//*[local-name()='CxlSts']");
            }
            if (cxlSts == null) {
                cxlSts = extractFirst(xpath, doc, "//*[local-name()='Sts']/*[local-name()='Conf']");
            }

            String rjctRsn = extractFirst(xpath, doc,
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

            String statut = mapCamt056Status(cxlSts);

            Optional<Camt056> camtOpt = Optional.empty();

            if (orgnlUetr != null && !orgnlUetr.isBlank()) {
                camtOpt = camt056Repository.findTopByUetrOrderByCreatedAtDesc(orgnlUetr);
            }

            if (camtOpt.isEmpty() && orgnlMsgId != null && !orgnlMsgId.isBlank()) {
                camtOpt = camt056Repository.findTopByOriginalMsgIdOrderByCreatedAtDesc(orgnlMsgId);
            }

            if (camtOpt.isEmpty()) {
                System.err.println("[Camt029Parser] ⚠️ Camt056 introuvable");
                return;
            }

            Camt056 camt056 = camtOpt.get();
            camt056.setStatut(statut);

            if ("RJCT".equals(statut) && rjctRsn != null && !rjctRsn.isBlank()) {
                camt056.setMotifRefus(rjctRsn);
            }

            camt056Repository.save(camt056);

            System.out.println("[Camt029Parser] ✅ Camt056 mis à jour: "
                    + camt056.getMessageId() + " → " + statut);

        } catch (Exception e) {
            System.err.println("[Camt029Parser]  Error: "
                    + file.getFileName() + " → " + e.getMessage());
            throw new RuntimeException("Camt029 parsing failed: " + e.getMessage(), e);
        }
    }

    private String mapCamt056Status(String cxlSts) {
        if (cxlSts == null) return "PDNG";

        return switch (cxlSts.toUpperCase()) {
            case "ACCP", "ACCW", "CANC" -> "ACCP";
            case "RJCT", "RJCR" -> "RJCT";
            default -> "PDNG";
        };
    }

    private String extractFirst(XPath xpath, Document doc, String expression) {
        try {
            NodeList nodes = (NodeList) xpath.evaluate(expression, doc, XPathConstants.NODESET);

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