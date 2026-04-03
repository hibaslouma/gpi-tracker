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
            System.err.println("[ClientRecu] ❌ File not found: " + file);
            return;
        }

        if (!Files.isReadable(file)) {
            System.err.println("[ClientRecu] ❌ File not readable: " + file);
            return;
        }

        try {
            mxParserService.parsingMx(file);
            System.out.println("[ClientRecu] ✅ File processed successfully: " + file.getFileName());
        } catch (Exception e) {
            System.err.println("[ClientRecu] ❌ Failed to process: " + file.getFileName() + " → " + e.getMessage());
            throw e; // rethrow so FolderWatcher knows it failed and can log accordingly
        }
    }
}