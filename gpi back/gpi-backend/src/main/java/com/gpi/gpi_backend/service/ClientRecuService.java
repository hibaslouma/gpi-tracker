package com.gpi.gpi_backend.service;

import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class ClientRecuService {

    private final MxParserService mxParserService;
    private final Pacs002ParserService pacs002ParserService;
    private final Pacs009ParserService pacs009ParserService;

    public ClientRecuService(MxParserService mxParserService,
                             Pacs002ParserService pacs002ParserService,
                             Pacs009ParserService pacs009ParserService) {
        this.mxParserService = mxParserService;
        this.pacs002ParserService = pacs002ParserService;
        this.pacs009ParserService = pacs009ParserService;
    }

    public void clientRecu(Path file) {
        System.out.println("[ClientRecu]  File received: " + file.getFileName());

        if (!Files.exists(file)) return;
        if (!Files.isReadable(file)) return;

        try {
            String content = Files.readString(file);

            if (content.contains("xsd:pacs.008")) {
                // ── pacs.008 → customer credit transfer ───────────
                System.out.println("[ClientRecu]  Type détecté: pacs.008 (RECU)");
                mxParserService.parsingMx(file, "RECU");

            } else if (content.contains("xsd:pacs.009") && content.contains("COV")) {
                // ── pacs.009 COV → cover payment ──────────────────
                System.out.println("[ClientRecu]  Type détecté: pacs.009 COV (RECU)");
                pacs009ParserService.parsingPacs009Cov(file, "RECU");

            } else if (content.contains("xsd:pacs.009")) {
                // ── pacs.009 → FI credit transfer ─────────────────
                System.out.println("[ClientRecu]  Type détecté: pacs.009 (RECU)");
                pacs009ParserService.parsingPacs009(file, "RECU");

            } else if (content.contains("xsd:pacs.002")) {
                // ── pacs.002 → status report (update existing) ────
                System.out.println("[ClientRecu]  Type détecté: pacs.002");
                pacs002ParserService.parsingPacs002(file);

            } else {
                System.err.println("[ClientRecu]  ⚠️ Type de message inconnu: "
                        + file.getFileName());
                return;
            }

            System.out.println("[ClientRecu]  ✅ File processed: " + file.getFileName());

        } catch (Exception e) {
            System.err.println("[ClientRecu]  Failed: " + file.getFileName()
                    + " → " + e.getMessage());
            throw new RuntimeException(e);
        }
    }
}