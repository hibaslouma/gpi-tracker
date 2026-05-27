package com.gpi.gpi_backend.controller;

import com.gpi.gpi_backend.dto.BanqueDTO;
import com.gpi.gpi_backend.service.BanqueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/banques")
@RequiredArgsConstructor
public class BanqueController {

    private final BanqueService service;

    @GetMapping
    public ResponseEntity<List<BanqueDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BanqueDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<BanqueDTO> create(@RequestBody BanqueDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BanqueDTO> update(@PathVariable Long id, @RequestBody BanqueDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}