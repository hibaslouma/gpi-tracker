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
public class MxParserService {

    private final RecapMgRepository recapMgRepository;

    public void parsingMx(Path file, String typeMsg) {
        System.out.println("[MxParser] 🔍 Parsing pacs.008: " + file.getFileName());
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(file.toFile());
            doc.getDocumentElement().normalize();

            XPath xpath = XPathFactory.newInstance().newXPath();

            String messageId = extractFirst(xpath, doc, "//*[local-name()='MsgId']");
            if (messageId != null && recapMgRepository.existsByMessageId(messageId)) {
                System.out.println("[MxParser] ⚠️ Already processed messageId: "
                        + messageId + " — skipping");
                return;
            }

            String uetr          = extractFirst(xpath, doc, "//*[local-name()='UETR']");
            String senderName    = extractFirst(xpath, doc, "//*[local-name()='Dbtr']/*[local-name()='Nm']");
            String senderStreet  = extractFirst(xpath, doc, "//*[local-name()='Dbtr']//*[local-name()='StrtNm']");
            String senderBldg    = extractFirst(xpath, doc, "//*[local-name()='Dbtr']//*[local-name()='BldgNb']");
            String senderPstCd   = extractFirst(xpath, doc, "//*[local-name()='Dbtr']//*[local-name()='PstCd']");
            String senderCity    = extractFirst(xpath, doc, "//*[local-name()='Dbtr']//*[local-name()='TwnNm']");
            String senderCountry = extractFirst(xpath, doc, "//*[local-name()='Dbtr']//*[local-name()='Ctry']");
            String senderAddress = buildAddress(senderStreet, senderBldg, senderPstCd, senderCity, senderCountry);
            String senderBic     = extractFirst(xpath, doc, "//*[local-name()='DbtrAgt']//*[local-name()='BICFI']");
            String senderIban    = extractFirst(xpath, doc, "//*[local-name()='DbtrAcct']//*[local-name()='IBAN']");

            String receiverName    = extractFirst(xpath, doc, "//*[local-name()='Cdtr']/*[local-name()='Nm']");
            String receiverStreet  = extractFirst(xpath, doc, "//*[local-name()='Cdtr']//*[local-name()='StrtNm']");
            String receiverBldg    = extractFirst(xpath, doc, "//*[local-name()='Cdtr']//*[local-name()='BldgNb']");
            String receiverPstCd   = extractFirst(xpath, doc, "//*[local-name()='Cdtr']//*[local-name()='PstCd']");
            String receiverCity    = extractFirst(xpath, doc, "//*[local-name()='Cdtr']//*[local-name()='TwnNm']");
            String receiverCountry = extractFirst(xpath, doc, "//*[local-name()='Cdtr']//*[local-name()='Ctry']");
            String receiverAdrLine = extractFirst(xpath, doc, "//*[local-name()='Cdtr']//*[local-name()='AdrLine']");
            String receiverAddress = receiverAdrLine != null
                    ? receiverAdrLine
                    : buildAddress(receiverStreet, receiverBldg, receiverPstCd, receiverCity, receiverCountry);
            String receiverBic     = extractFirst(xpath, doc, "//*[local-name()='CdtrAgt']//*[local-name()='BICFI']");
            String receiverIban    = extractFirst(xpath, doc, "//*[local-name()='CdtrAcct']//*[local-name()='IBAN']");

            String montantStr = extractFirst(xpath, doc, "//*[local-name()='IntrBkSttlmAmt']");
            String devise     = extractAttribute(xpath, doc, "//*[local-name()='IntrBkSttlmAmt']", "Ccy");
            BigDecimal montant = null;
            if (montantStr != null && !montantStr.isBlank()) {
                montant = new BigDecimal(montantStr.trim());
            }

            String dateStr = extractFirst(xpath, doc, "//*[local-name()='IntrBkSttlmDt']");
            LocalDate dateValeur = null;
            if (dateStr != null && !dateStr.isBlank()) {
                dateValeur = LocalDate.parse(dateStr.trim());
            }

            RecapMg recap = RecapMg.builder()
                    .messageId(messageId)
                    .uetr(uetr)
                    .typeMsg(typeMsg)
                    .msgType("pacs.008")   // ✅ store message type
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

            System.out.println("[MxParser] ✅ Saved pacs.008 to RECAP_MG:"
                    + "\n  messageId  : " + messageId
                    + "\n  uetr       : " + uetr
                    + "\n  typeMsg    : " + typeMsg
                    + "\n  msgType    : pacs.008"
                    + "\n  sender     : " + senderName + " (" + senderBic + ")"
                    + "\n  receiver   : " + receiverName + " (" + receiverBic + ")"
                    + "\n  montant    : " + montant + " " + devise
                    + "\n  dateValeur : " + dateValeur
                    + "\n  file       : " + file.getFileName());

        } catch (Exception e) {
            System.err.println("[MxParser] ❌ Error parsing: "
                    + file.getFileName() + " → " + e.getMessage());
            throw new RuntimeException("Parsing failed: " + e.getMessage());
        }
    }

    private String extractFirst(XPath xpath, Document doc, String expression) {
        try {
            NodeList nodes = (NodeList) xpath.evaluate(expression, doc, XPathConstants.NODESET);
            if (nodes != null && nodes.getLength() > 0) {
                String val = nodes.item(0).getTextContent();
                return val != null && !val.isBlank() ? val.trim() : null;
            }
        } catch (Exception e) {
            System.err.println("[MxParser] ⚠️ XPath error: " + expression + " → " + e.getMessage());
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
            System.err.println("[MxParser] ⚠️ Attribute error: " + expression + "@" + attribute);
        }
        return null;
    }

    private String buildAddress(String street, String bldg, String pstCd,
                                String city, String country) {
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
}