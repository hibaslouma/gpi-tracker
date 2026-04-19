package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.dto.ParametrageDTO;
import com.gpi.gpi_backend.service.ParametrageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/parametrage")
@RequiredArgsConstructor
public class ParametrageController {

    private final ParametrageService parametrageService;

    @GetMapping
    public ResponseEntity<ParametrageDTO> get() {
        return ResponseEntity.ok(parametrageService.get());
    }

    @PatchMapping
    public ResponseEntity<ParametrageDTO> save(
            @RequestBody ParametrageDTO dto) {
        return ResponseEntity.ok(parametrageService.save(dto));
    }
}