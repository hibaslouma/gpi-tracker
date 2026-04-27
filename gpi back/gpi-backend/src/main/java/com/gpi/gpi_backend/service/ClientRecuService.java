package com.gpi.gpi_backend.service;

import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class ClientRecuService {

    private final MxParserService mxParserService;
    private final Pacs002ParserService pacs002ParserService;
    private final Pacs009ParserService pacs009ParserService;
    private final Camt029ParserService camt029ParserService;
    private final Camt056ParserService camt056ParserService;

    public ClientRecuService(MxParserService mxParserService,
                             Pacs002ParserService pacs002ParserService,
                             Pacs009ParserService pacs009ParserService,
                             Camt029ParserService camt029ParserService,
                             Camt056ParserService camt056ParserService) {
        this.mxParserService = mxParserService;
        this.pacs002ParserService = pacs002ParserService;
        this.pacs009ParserService = pacs009ParserService;
        this.camt029ParserService = camt029ParserService;
        this.camt056ParserService = camt056ParserService;
    }

    public void clientRecu(Path file) {
        System.out.println("[ClientRecu]  File received: " + file.getFileName());

        if (!Files.exists(file)) return;
        if (!Files.isReadable(file)) return;

        try {
            String fileName = file.getFileName().toString();
            String content = Files.readString(file);

            if (content.contains("xsd:pacs.008")) {
                System.out.println("[ClientRecu]  Type détecté: pacs.008 (RECU)");
                mxParserService.parsingMx(file, "RECU");

            } else if (content.contains("xsd:pacs.009") && content.contains("COV")) {
                System.out.println("[ClientRecu]  Type détecté: pacs.009 COV (RECU)");
                pacs009ParserService.parsingPacs009Cov(file, "RECU");

            } else if (content.contains("xsd:pacs.009")) {
                System.out.println("[ClientRecu]  Type détecté: pacs.009 (RECU)");
                pacs009ParserService.parsingPacs009(file, "RECU");

            } else if (content.contains("xsd:pacs.002")) {
                System.out.println("[ClientRecu]  Type détecté: pacs.002");
                pacs002ParserService.parsingPacs002(file);

            } else if (content.contains("camt.056")) {
                System.out.println("[ClientRecu]  Type détecté: camt.056 (RECU)");
                camt056ParserService.parsingCamt056(file);

            } else if (content.contains("camt.029")) {
                System.out.println("[ClientRecu]  Type détecté: camt.029");
                camt029ParserService.parsingCamt029(file);

            } else {
                System.err.println("[ClientRecu]  ⚠️ Type de message inconnu: " + fileName);
                return;
            }

            System.out.println("[ClientRecu]  ✅ File processed: " + fileName);

        } catch (Exception e) {
            System.err.println("[ClientRecu]  Failed: " + file.getFileName()
                    + " → " + e.getMessage());
            throw new RuntimeException(e);
        }
    }
}