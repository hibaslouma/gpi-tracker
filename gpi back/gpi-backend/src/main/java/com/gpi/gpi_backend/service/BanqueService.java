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
        b.setBic(dto.getBic());
        b.setNomBanque(dto.getNomBanque());
        b.setPaysCode(dto.getPaysCode());
        b.setPaysNom(dto.getPaysNom());
        b.setFlagUrl(dto.getFlagUrl());
        b.setTypeBanque(dto.getTypeBanque());
        b.setDevise(dto.getDevise());
        b.setCutOff(dto.getCutOff());
        b.setFuseauHoraire(dto.getFuseauHoraire());
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
                .id(b.getId())
                .bic(b.getBic())
                .nomBanque(b.getNomBanque())
                .paysCode(b.getPaysCode())
                .paysNom(b.getPaysNom())
                .flagUrl(b.getFlagUrl())
                .typeBanque(b.getTypeBanque())
                .devise(b.getDevise())
                .cutOff(b.getCutOff())
                .fuseauHoraire(b.getFuseauHoraire())
                .build();
    }

    private Banque toEntity(BanqueDTO dto) {
        return Banque.builder()
                .bic(dto.getBic())
                .nomBanque(dto.getNomBanque())
                .paysCode(dto.getPaysCode())
                .paysNom(dto.getPaysNom())
                .flagUrl(dto.getFlagUrl())
                .typeBanque(dto.getTypeBanque())
                .devise(dto.getDevise())
                .cutOff(dto.getCutOff())
                .fuseauHoraire(dto.getFuseauHoraire())
                .build();
    }
}