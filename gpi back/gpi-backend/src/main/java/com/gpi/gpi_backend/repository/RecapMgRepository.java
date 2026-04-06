package com.gpi.gpi_backend.repository;

import com.gpi.gpi_backend.model.RecapMg;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
@Repository
public interface RecapMgRepository extends JpaRepository<RecapMg, Long> {
    List<RecapMg> findByFileName(String fileName);
    boolean existsByMessageId(String messageId);
    List<RecapMg> findByStatut(String statut);
    long countByStatut(String statut);
    // Utilisé pour lier pacs.002 reçu → pacs.008 émis
    Optional<RecapMg> findByUetr(String uetr);
    Optional<RecapMg> findByMessageId(String messageId);
    List<RecapMg> findByTypeMsg(String typeMsg);
}