package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.dto.BanqueDTO;
import com.gpi.gpi_backend.model.Banque;
import com.gpi.gpi_backend.repository.BanqueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BanqueService {

    private final BanqueRepository repository;

    public List<BanqueDTO> getAll() {
        return repository.findAll()
                .stream().map(this::toDTO)
                .collect(Collectors.toList());
    }

    public BanqueDTO getById(Long id) {
        return toDTO(repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Banque non trouvée : " + id)));
    }

    public BanqueDTO create(BanqueDTO dto) {
        if (repository.existsByBic(dto.getBic())) {
            throw new RuntimeException("BIC déjà existant : " + dto.getBic());
        }
        return toDTO(repository.save(toEntity(dto)));
    }

    public BanqueDTO update(Long id, BanqueDTO dto) {
        Banque b = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Banque non trouvée : " + id));
        b.setParticipant(dto.getParticipant());
        b.setNomBanque(dto.getNomBanque());
        b.setPaysCode(dto.getPaysCode());
        b.setPaysNom(dto.getPaysNom());
        b.setFlagUrl(dto.getFlagUrl());
        b.setBic(dto.getBic());
        b.setDevises(dto.getDevises());
        b.setStatut(dto.getStatut());
        b.setCutOff(dto.getCutOff());
        b.setReseau(dto.getReseau());
        return toDTO(repository.save(b));
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Banque non trouvée : " + id);
        }
        repository.deleteById(id);
    }

    private BanqueDTO toDTO(Banque b) {
        return BanqueDTO.builder()
                .id(b.getId()).participant(b.getParticipant())
                .nomBanque(b.getNomBanque()).paysCode(b.getPaysCode())
                .paysNom(b.getPaysNom()).flagUrl(b.getFlagUrl())
                .bic(b.getBic()).devises(b.getDevises())
                .statut(b.getStatut()).cutOff(b.getCutOff())
                .reseau(b.getReseau()).build();
    }

    private Banque toEntity(BanqueDTO dto) {
        return Banque.builder()
                .participant(dto.getParticipant()).nomBanque(dto.getNomBanque())
                .paysCode(dto.getPaysCode()).paysNom(dto.getPaysNom())
                .flagUrl(dto.getFlagUrl()).bic(dto.getBic())
                .devises(dto.getDevises()).statut(dto.getStatut())
                .cutOff(dto.getCutOff()).reseau(dto.getReseau()).build();
    }
}