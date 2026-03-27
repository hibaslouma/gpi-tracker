package com.gpi.gpi_backend.service;

import org.springframework.stereotype.Service;

import java.nio.file.Path;

@Service
public class MxParserService {

    public void parsingMx(Path file) {
        // TODO: implement MX parsing logic
        System.out.println("[MxParser] parsingMx called for: " + file.getFileName());
    }
}