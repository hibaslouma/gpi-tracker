package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.model.RecapMg;
import com.gpi.gpi_backend.repository.RecapMgRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/backoffice")
@RequiredArgsConstructor
public class RecapMgController {

    private final RecapMgRepository recapMgRepository;

    @GetMapping("/paiements-recus")
    public ResponseEntity<List<RecapMg>> getPaiementsRecus() {
        return ResponseEntity.ok(recapMgRepository.findAll());
    }
}