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
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class Pacs009ParserService {

    private final RecapMgRepository recapMgRepository;

    public void parsingPacs009(Path file, String typeMsg) {
        System.out.println("[Pacs009Parser] 🔍 Parsing pacs.009: " + file.getFileName());
        parseAndSave(file, typeMsg, "pacs.009");
    }

    public void parsingPacs009Cov(Path file, String typeMsg) {
        System.out.println("[Pacs009Parser] 🔍 Parsing pacs.009 COV: " + file.getFileName());
        parseAndSave(file, typeMsg, "pacs.009.COV");
    }

    private void parseAndSave(Path file, String typeMsg, String subType) {
        try {
            Document doc = parseXml(file);
            XPath xpath = XPathFactory.newInstance().newXPath();

            String messageId = extractFirst(xpath, doc, "//*[local-name()='MsgId']");
            if (messageId != null && recapMgRepository.existsByMessageId(messageId)) {
                System.out.println("[Pacs009Parser] ⚠️ Already processed: "
                        + messageId + " — skipping");
                return;
            }

            String uetr = extractFirst(xpath, doc, "//*[local-name()='UETR']");

            if ("pacs.009.COV".equals(subType)) {
                String covUetr = extractFirst(xpath, doc,
                        "//*[local-name()='UndrlygCstmrCdtTrf']//*[local-name()='UETR']");
                if (covUetr != null && uetr == null) uetr = covUetr;
                System.out.println("[Pacs009Parser]    Underlying UETR (COV): " + covUetr);
            }

            String senderBic = extractFirst(xpath, doc,
                    "//*[local-name()='InstgAgt']//*[local-name()='BICFI']");
            if (senderBic == null) {
                senderBic = extractFirst(xpath, doc,
                        "//*[local-name()='DbtrAgt']//*[local-name()='BICFI']");
            }
            String senderName    = extractFirst(xpath, doc,
                    "//*[local-name()='Dbtr']/*[local-name()='Nm']");
            String senderIban    = extractFirst(xpath, doc,
                    "//*[local-name()='DbtrAcct']//*[local-name()='IBAN']");
            String senderAddress = buildAddress(xpath, doc, "Dbtr");

            String receiverBic = extractFirst(xpath, doc,
                    "//*[local-name()='InstdAgt']//*[local-name()='BICFI']");
            if (receiverBic == null) {
                receiverBic = extractFirst(xpath, doc,
                        "//*[local-name()='CdtrAgt']//*[local-name()='BICFI']");
            }
            String receiverName    = extractFirst(xpath, doc,
                    "//*[local-name()='Cdtr']/*[local-name()='Nm']");
            String receiverIban    = extractFirst(xpath, doc,
                    "//*[local-name()='CdtrAcct']//*[local-name()='IBAN']");
            String receiverAddress = buildAddress(xpath, doc, "Cdtr");

            String montantStr = extractFirst(xpath, doc, "//*[local-name()='IntrBkSttlmAmt']");
            String devise     = extractAttribute(xpath, doc,
                    "//*[local-name()='IntrBkSttlmAmt']", "Ccy");
            BigDecimal montant = parseMontant(montantStr);

            String dateStr   = extractFirst(xpath, doc, "//*[local-name()='IntrBkSttlmDt']");
            LocalDate dateValeur = parseDate(dateStr);

            RecapMg recap = RecapMg.builder()
                    .messageId(messageId)
                    .uetr(uetr)
                    .typeMsg(typeMsg)
                    .msgType(subType)      // ✅ pacs.009 or pacs.009.COV
                    .senderName(senderName)
                    .senderAddress(senderAddress)
                    .senderBic(senderBic)
                    .senderIban(senderIban)
                    .receiverName(receiverName)
                    .receiverAddress(receiverAddress)
                    .receiverBic(receiverBic)
                    .receiverIban(receiverIban)
                    .montant(montant)
                    .devise(devise)
                    .dateValeur(dateValeur)
                    .fileName(file.getFileName().toString())
                    .build();

            recapMgRepository.save(recap);

            System.out.println("[Pacs009Parser] ✅ Saved [" + subType + "] to RECAP_MG:"
                    + "\n  messageId  : " + messageId
                    + "\n  uetr       : " + uetr
                    + "\n  typeMsg    : " + typeMsg
                    + "\n  msgType    : " + subType
                    + "\n  sender     : " + senderName + " (" + senderBic + ")"
                    + "\n  receiver   : " + receiverName + " (" + receiverBic + ")"
                    + "\n  montant    : " + montant + " " + devise
                    + "\n  dateValeur : " + dateValeur
                    + "\n  file       : " + file.getFileName());

        } catch (Exception e) {
            System.err.println("[Pacs009Parser] ❌ Error parsing " + subType + ": "
                    + file.getFileName() + " → " + e.getMessage());
            throw new RuntimeException("Parsing failed: " + e.getMessage());
        }
    }

    private Document parseXml(Path file) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(false);
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(file.toFile());
        doc.getDocumentElement().normalize();
        return doc;
    }

    private String buildAddress(XPath xpath, Document doc, String party) {
        String adrLine = extractFirst(xpath, doc,
                "//*[local-name()='" + party + "']//*[local-name()='AdrLine']");
        if (adrLine != null) return adrLine;
        String street  = extractFirst(xpath, doc, "//*[local-name()='" + party + "']//*[local-name()='StrtNm']");
        String bldg    = extractFirst(xpath, doc, "//*[local-name()='" + party + "']//*[local-name()='BldgNb']");
        String pstCd   = extractFirst(xpath, doc, "//*[local-name()='" + party + "']//*[local-name()='PstCd']");
        String city    = extractFirst(xpath, doc, "//*[local-name()='" + party + "']//*[local-name()='TwnNm']");
        String country = extractFirst(xpath, doc, "//*[local-name()='" + party + "']//*[local-name()='Ctry']");
        StringBuilder sb = new StringBuilder();
        if (street  != null) sb.append(street).append(" ");
        if (bldg    != null) sb.append(bldg).append(", ");
        if (pstCd   != null) sb.append(pstCd).append(" ");
        if (city    != null) sb.append(city).append(", ");
        if (country != null) sb.append(country);
        String result = sb.toString().trim();
        if (result.endsWith(",")) result = result.substring(0, result.length() - 1).trim();
        return result.isBlank() ? null : result;
    }

    private String extractFirst(XPath xpath, Document doc, String expression) {
        try {
            NodeList nodes = (NodeList) xpath.evaluate(expression, doc, XPathConstants.NODESET);
            if (nodes != null && nodes.getLength() > 0) {
                String val = nodes.item(0).getTextContent();
                return val != null && !val.isBlank() ? val.trim() : null;
            }
        } catch (Exception e) {
            System.err.println("[Pacs009Parser] ⚠️ XPath error: " + expression + " → " + e.getMessage());
        }
        return null;
    }

    private String extractAttribute(XPath xpath, Document doc,
                                    String expression, String attribute) {
        try {
            NodeList nodes = (NodeList) xpath.evaluate(expression, doc, XPathConstants.NODESET);
            if (nodes != null && nodes.getLength() > 0) {
                var attr = nodes.item(0).getAttributes().getNamedItem(attribute);
                return attr != null ? attr.getNodeValue() : null;
            }
        } catch (Exception e) {
            System.err.println("[Pacs009Parser] ⚠️ Attribute error: " + expression + "@" + attribute);
        }
        return null;
    }

    private BigDecimal parseMontant(String s) {
        if (s != null && !s.isBlank()) {
            try { return new BigDecimal(s.trim()); } catch (Exception ignored) {}
        }
        return null;
    }

    private LocalDate parseDate(String s) {
        if (s != null && !s.isBlank()) {
            try { return LocalDate.parse(s.trim()); } catch (Exception ignored) {}
        }
        return null;
    }
}