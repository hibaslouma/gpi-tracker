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

@Service
@RequiredArgsConstructor
public class Camt056ParserService {

    private final Camt056Repository camt056Repository;

    public void parsingCamt056(Path file) {
        System.out.println("[Camt056Parser] 🔍 Parsing camt.056 RECU: " + file.getFileName());

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(false);

            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(file.toFile());
            doc.getDocumentElement().normalize();

            XPath xpath = XPathFactory.newInstance().newXPath();

            String bizMsgIdr = extractFirst(xpath, doc, "//*[local-name()='BizMsgIdr']");
            String assgnmtId = extractFirst(xpath, doc, "//*[local-name()='FIToFIPmtCxlReq']/*[local-name()='Assgnmt']/*[local-name()='Id']");
            String messageId = notBlank(bizMsgIdr) ? bizMsgIdr : assgnmtId;

            String originalMsgId = extractFirst(xpath, doc, "//*[local-name()='OrgnlMsgId']");
            String originalUetr = extractFirst(xpath, doc, "//*[local-name()='OrgnlUETR']");

            String bicEmetteur = extractFirst(xpath, doc,
                    "//*[local-name()='AppHdr']/*[local-name()='Fr']//*[local-name()='BICFI']");

            String bicRecepteur = extractFirst(xpath, doc,
                    "//*[local-name()='AppHdr']/*[local-name()='To']//*[local-name()='BICFI']");

            if (!notBlank(bicEmetteur)) {
                bicEmetteur = extractFirst(xpath, doc,
                        "//*[local-name()='Assgnr']//*[local-name()='BICFI']");
            }

            if (!notBlank(bicRecepteur)) {
                bicRecepteur = extractFirst(xpath, doc,
                        "//*[local-name()='Assgne']//*[local-name()='BICFI']");
            }

            String motif = extractFirst(xpath, doc,
                    "//*[local-name()='CxlRsnInf']/*[local-name()='Rsn']/*[local-name()='Cd']");

            String motifDetail = extractFirst(xpath, doc,
                    "//*[local-name()='CxlRsnInf']/*[local-name()='AddtlInf']");

            System.out.println("[Camt056Parser] MessageId      : " + messageId);
            System.out.println("[Camt056Parser] OriginalMsgId  : " + originalMsgId);
            System.out.println("[Camt056Parser] OriginalUETR   : " + originalUetr);
            System.out.println("[Camt056Parser] BIC Emetteur   : " + bicEmetteur);
            System.out.println("[Camt056Parser] BIC Recepteur  : " + bicRecepteur);
            System.out.println("[Camt056Parser] Motif          : " + motif);
            System.out.println("[Camt056Parser] Detail         : " + motifDetail);

            if (!notBlank(messageId)) {
                throw new RuntimeException("MessageId camt.056 introuvable");
            }

            if (camt056Repository.existsByMessageId(messageId)) {
                System.out.println("[Camt056Parser] ⚠️ camt.056 déjà existant: " + messageId);
                return;
            }

            Camt056 camt056 = Camt056.builder()
                    .messageId(messageId)
                    .originalMsgId(originalMsgId)
                    .uetr(originalUetr)
                    .bicEmetteur(bicEmetteur)
                    .bicRecepteur(bicRecepteur)
                    .motif(notBlank(motif) ? motif : "NARR")
                    .motifDetail(motifDetail)
                    .statut("PDNG")
                    .fileName(file.getFileName().toString())
                    .build();

            camt056Repository.save(camt056);

            System.out.println("[Camt056Parser] ✅ camt.056 RECU enregistré: " + messageId);

        } catch (Exception e) {
            System.err.println("[Camt056Parser] ❌ Error: "
                    + file.getFileName() + " → " + e.getMessage());
            throw new RuntimeException("Camt056 parsing failed: " + e.getMessage(), e);
        }
    }

    private String extractFirst(XPath xpath, Document doc, String expression) {
        try {
            NodeList nodes = (NodeList) xpath.evaluate(expression, doc, XPathConstants.NODESET);

            if (nodes != null && nodes.getLength() > 0) {
                String value = nodes.item(0).getTextContent();
                return value != null && !value.isBlank() ? value.trim() : null;
            }
        } catch (Exception e) {
            System.err.println("[Camt056Parser] XPath error: " + expression);
        }

        return null;
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}