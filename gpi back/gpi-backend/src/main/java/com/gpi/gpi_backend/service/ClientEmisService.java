package com.gpi.gpi_backend.service;

import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class ClientEmisService {

    private final MxParserService mxParserService;

    public ClientEmisService(MxParserService mxParserService) {
        this.mxParserService = mxParserService;
    }

    public void clientEmis(Path file) {


        // ✅ Valide que le fichier existe
        if (!Files.exists(file)) {
            System.err.println("[ClientEmis]  File not found: " + file);
            return;
        }

        //  Valide que le fichier est lisible
        if (!Files.isReadable(file)) {
            System.err.println("[ClientEmis]  File not readable: " + file);
            return;
        }

        try {
            //  "EMIS" car fichier vient de client emis (outgoing)
            mxParserService.parsingMx(file, "EMIS");
            System.out.println("[ClientEmis]  File processed: " + file.getFileName());
        } catch (Exception e) {
            System.err.println("[ClientEmis]  Failed: " + file.getFileName()
                    + " → " + e.getMessage());
            throw e;
        }
    }
}