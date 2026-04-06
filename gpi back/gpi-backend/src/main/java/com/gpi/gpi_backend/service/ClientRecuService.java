package com.gpi.gpi_backend.service;

import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class ClientRecuService {

    private final MxParserService mxParserService;
    private final Pacs002ParserService pacs002ParserService;

    public ClientRecuService(MxParserService mxParserService,
                             Pacs002ParserService pacs002ParserService) {
        this.mxParserService = mxParserService;
        this.pacs002ParserService = pacs002ParserService;
    }

    public void clientRecu(Path file) {
        System.out.println("[ClientRecu]  File received: " + file.getFileName());

        // ✅ Validate file exists and is readable
        if (!Files.exists(file)) {

            return;
        }

        if (!Files.isReadable(file)) {

            return;
        }

        try {
            //  Détecter le type de message
            String content = Files.readString(file);

            if (content.contains("pacs.008")) {
                // C'est un pacs.008 → parser comme paiement reçu

                mxParserService.parsingMx(file, "RECU");

            } else if (content.contains("pacs.002")) {
                // C'est un pacs.002 → mettre à jour le statut
                pacs002ParserService.parsingPacs002(file);

            } else {
                System.err.println("[ClientRecu]  Type de message inconnu: "
                        + file.getFileName());
            }

            System.out.println("[ClientRecu]  File processed: " + file.getFileName());

        } catch (Exception e) {
            System.err.println("[ClientRecu]  Failed: " + file.getFileName()
                    + " → " + e.getMessage());
            throw new RuntimeException(e);
        }
    }
}