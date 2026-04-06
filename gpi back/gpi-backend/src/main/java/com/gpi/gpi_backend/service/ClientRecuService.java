package com.gpi.gpi_backend.service;

import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class ClientRecuService {

    private final MxParserService mxParserService;

    public ClientRecuService(MxParserService mxParserService) {
        this.mxParserService = mxParserService;
    }

    public void clientRecu(Path file) {
        System.out.println("[ClientRecu] 📥 File received: " + file.getFileName());

        // ✅ Validate file exists and is readable
        if (!Files.exists(file)) {

            return;
        }

        if (!Files.isReadable(file)) {

            return;
        }

        try {
            mxParserService.parsingMx(file,"RECU");

        } catch (Exception e) {

            throw e;
        }
    }
}