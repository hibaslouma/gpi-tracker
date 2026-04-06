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
public class Pacs002ParserService {

    private final RecapMgRepository recapMgRepository;

    public void parsingPacs002(Path file) {
        System.out.println("[Pacs002Parser]  Parsing pacs.002: " + file.getFileName());

        try {
            // ── Parse XML ─────────────────────────────────────────────────
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(file.toFile());
            doc.getDocumentElement().normalize();

            XPath xpath = XPathFactory.newInstance().newXPath();

            // ── Extraire les champs importants ────────────────────────────
            String orgnlMsgId = extractFirst(xpath, doc,
                    "//*[local-name()='OrgnlMsgId']");

            String orgnlUetr = extractFirst(xpath, doc,
                    "//*[local-name()='OrgnlUETR']");


            String txSts = extractFirst(xpath, doc,
                    "//*[local-name()='TxSts']");

            String motifRejet = extractFirst(xpath, doc,
                    "//*[local-name()='Cd']");

            System.out.println("[Pacs002Parser] OrgnlMsgId : " + orgnlMsgId);
            System.out.println("[Pacs002Parser] OrgnlUETR  : " + orgnlUetr);
            System.out.println("[Pacs002Parser] TxSts      : " + txSts);
            System.out.println("[Pacs002Parser] MotifRejet : " + motifRejet);

            // ── Trouver le pacs.008 correspondant via UETR ────────────────


            if (orgnlUetr == null) {
                System.err.println("[Pacs002Parser]  UETR manquant dans le pacs.002");
                return;
            }
            Optional<RecapMg> recapOpt = recapMgRepository.findByUetr(orgnlUetr);
            if (recapOpt.isEmpty()) {
                System.err.println("[Pacs002Parser]  Paiement introuvable pour UETR: " + orgnlUetr);
                return;
            }



            // ── Mettre à jour le statut ───────────────────────────────────
            RecapMg recap = recapOpt.get();
            String ancienStatut = recap.getStatut();

            recap.setStatut(txSts);
            if (motifRejet != null) {
                recap.setMotifRejet(motifRejet);
            }

            recapMgRepository.save(recap);

            System.out.println("[Pacs002Parser]  Statut mis à jour :"
                    + "\n  messageId    : " + recap.getMessageId()
                    + "\n  uetr         : " + recap.getUetr()
                    + "\n  ancienStatut : " + ancienStatut
                    + "\n  nouveauStatut: " + txSts
                    + "\n  motifRejet   : " + motifRejet);

        } catch (Exception e) {
            System.err.println("[Pacs002Parser]  Error: " + file.getFileName()
                    + " → " + e.getMessage());
            throw new RuntimeException("Pacs002 parsing failed: " + e.getMessage());
        }
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
            System.err.println("[Pacs002Parser] ️ XPath error: " + expression);
        }
        return null;
    }
}