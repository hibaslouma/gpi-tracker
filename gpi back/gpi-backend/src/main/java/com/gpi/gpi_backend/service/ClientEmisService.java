package com.gpi.gpi_backend.service;

import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class ClientEmisService {

    private final MxParserService mxParserService;
    private final Pacs009ParserService pacs009ParserService;

    public ClientEmisService(MxParserService mxParserService,
                             Pacs009ParserService pacs009ParserService) {
        this.mxParserService = mxParserService;
        this.pacs009ParserService = pacs009ParserService;
    }

    public void clientEmis(Path file) {
        System.out.println("[ClientEmis]  File received: " + file.getFileName());

        if (!Files.exists(file)) {
            System.err.println("[ClientEmis]  File not found: " + file);
            return;
        }

        if (!Files.isReadable(file)) {
            System.err.println("[ClientEmis]  File not readable: " + file);
            return;
        }

        try {
            String content = Files.readString(file);

            if (content.contains("xsd:pacs.008")) {
                // ── pacs.008 → outgoing customer credit transfer
                System.out.println("[ClientEmis]  Type détecté: pacs.008 (EMIS)");
                mxParserService.parsingMx(file, "EMIS");

            } else if (content.contains("xsd:pacs.009") && content.contains("COV")) {
                // ── pacs.009 COV → outgoing cover payment
                System.out.println("[ClientEmis]  Type détecté: pacs.009 COV (EMIS)");
                pacs009ParserService.parsingPacs009Cov(file, "EMIS");

            } else if (content.contains("xsd:pacs.009")) {
                // ── pacs.009 → outgoing FI credit transfer
                System.out.println("[ClientEmis]  Type détecté: pacs.009 (EMIS)");
                pacs009ParserService.parsingPacs009(file, "EMIS");

            } else {
                System.err.println("[ClientEmis]  ⚠️ Type de message inconnu: "
                        + file.getFileName());
                return;
            }

            System.out.println("[ClientEmis]  ✅ File processed: " + file.getFileName());

        } catch (Exception e) {
            System.err.println("[ClientEmis]  Failed: " + file.getFileName()
                    + " → " + e.getMessage());
            throw new RuntimeException(e);
        }
    }
}