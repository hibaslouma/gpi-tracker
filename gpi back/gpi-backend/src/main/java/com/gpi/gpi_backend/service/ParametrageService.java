package com.gpi.gpi_backend.service;

import com.gpi.gpi_backend.dto.ParametrageDTO;
import com.gpi.gpi_backend.model.Parametrage;
import com.gpi.gpi_backend.repository.ParametrageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ParametrageService {

    private final ParametrageRepository parametrageRepository;

    @Value("${watcher.folder-path}")
    private String dossierRecu;

    @Value("${watcher.output-folder-path}")
    private String dossierEmis;

    public ParametrageDTO get() {
        Parametrage p = parametrageRepository.findById(1L)
                .orElse(new Parametrage());
        return toDTO(p);
    }

    public ParametrageDTO save(ParametrageDTO dto) {
        Parametrage p = parametrageRepository.findById(1L)
                .orElse(new Parametrage());
        p.setId(1L);
        p.setNomBanque(dto.getNomBanque());
        p.setBic(dto.getBic());
        p.setPays(dto.getPays());
        p.setFuseau(dto.getFuseau());
        p.setAdresse(dto.getAdresse());
        p.setTelephone(dto.getTelephone());
        p.setEmail(dto.getEmail());
        p.setSiteWeb(dto.getSiteWeb());
        p.setDelaiConfirmation(dto.getDelaiConfirmation());
        p.setDelaiAlerte(dto.getDelaiAlerte());
        p.setDelaiRecall(dto.getDelaiRecall());
        p.setDevisesActives(dto.getDevisesActives());
        p.setDeviseDefaut(dto.getDeviseDefaut());
        // XML — lecture seule depuis application.properties
        p.setDossierRecu(dossierRecu);
        p.setDossierEmis(dossierEmis);
        parametrageRepository.save(p);
        return toDTO(p);
    }

    private ParametrageDTO toDTO(Parametrage p) {
        ParametrageDTO dto = new ParametrageDTO();
        dto.setNomBanque(p.getNomBanque());
        dto.setBic(p.getBic());
        dto.setPays(p.getPays());
        dto.setFuseau(p.getFuseau());
        dto.setAdresse(p.getAdresse());
        dto.setTelephone(p.getTelephone());
        dto.setEmail(p.getEmail());
        dto.setSiteWeb(p.getSiteWeb());
        dto.setDelaiConfirmation(p.getDelaiConfirmation());
        dto.setDelaiAlerte(p.getDelaiAlerte());
        dto.setDelaiRecall(p.getDelaiRecall());
        dto.setDevisesActives(p.getDevisesActives());
        dto.setDeviseDefaut(p.getDeviseDefaut());
        dto.setDossierRecu(dossierRecu);
        dto.setDossierEmis(dossierEmis);
        return dto;
    }
}