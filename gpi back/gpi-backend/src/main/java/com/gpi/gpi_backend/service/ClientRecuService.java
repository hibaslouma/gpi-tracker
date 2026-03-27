package com.gpi.gpi_backend.service;

import org.springframework.stereotype.Service;

import java.nio.file.Path;

@Service
public class ClientRecuService {

    private final MxParserService mxParserService;

    public ClientRecuService(MxParserService mxParserService) {
        this.mxParserService = mxParserService;
    }

    public void clientRecu(Path file) {
        System.out.println("[ClientRecu] File received: " + file.getFileName());

        // call parsingMx
        mxParserService.parsingMx(file);
    }
}