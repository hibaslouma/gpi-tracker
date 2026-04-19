package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.repository.Camt056Repository;
import com.gpi.gpi_backend.model.Camt056;
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
    private final Camt056Service camt056Service;

    public void parsingCamt029(Path file) {
        System.out.println("[Camt029Parser] 🔍 Parsing camt.029: " + file.getFileName());

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(file.toFile());
            doc.getDocumentElement().normalize();

            XPath xpath = XPathFactory.newInstance().newXPath();

            // Extract fields from camt.029
            String orgnlMsgId  = extractFirst(xpath, doc, "//*[local-name()='OrgnlMsgId']");
            String orgnlUetr   = extractFirst(xpath, doc, "//*[local-name()='OrgnlUETR']");
            String cxlSts      = extractFirst(xpath, doc, "//*[local-name()='CxlSts']");    // ACCP or RJCT
            String rjctRsn     = extractFirst(xpath, doc, "//*[local-name()='Cd']");

            System.out.println("[Camt029Parser] OrgnlMsgId : " + orgnlMsgId);
            System.out.println("[Camt029Parser] OrgnlUETR  : " + orgnlUetr);
            System.out.println("[Camt029Parser] CxlSts     : " + cxlSts);
            System.out.println("[Camt029Parser] RjctRsn    : " + rjctRsn);

            if (orgnlUetr == null && orgnlMsgId == null) {
                System.err.println("[Camt029Parser] ⚠️ Aucune référence trouvée");
                return;
            }

            // Find camt.056 by UETR or original message ID
            Optional<Camt056> camt056Opt = orgnlUetr != null
                    ? camt056Repository.findByUetr(orgnlUetr)
                    : Optional.empty();

            if (camt056Opt.isEmpty()) {
                System.err.println("[Camt029Parser] ⚠️ camt.056 introuvable pour UETR: " + orgnlUetr);
                return;
            }

            // Map camt.029 status to our statut
            String statut = mapCamt029Status(cxlSts);
            camt056Service.updateStatut(orgnlUetr, statut, rjctRsn);

            System.out.println("[Camt029Parser] ✅ camt.056 mis à jour: "
                    + orgnlUetr + " → " + statut);

        } catch (Exception e) {
            System.err.println("[Camt029Parser] ❌ Error: "
                    + file.getFileName() + " → " + e.getMessage());
            throw new RuntimeException("Camt029 parsing failed: " + e.getMessage());
        }
    }

    private String mapCamt029Status(String cxlSts) {
        if (cxlSts == null) return "PDNG";
        return switch (cxlSts.toUpperCase()) {
            case "ACCP", "ACCW" -> "ACCP";
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