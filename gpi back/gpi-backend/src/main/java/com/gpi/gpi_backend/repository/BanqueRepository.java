package com.gpi.gpi_backend.repository;

import com.gpi.gpi_backend.model.Banque;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BanqueRepository extends JpaRepository<Banque, Long> {
    List<Banque> findByStatut(String statut);
    List<Banque> findByPaysCode(String paysCode);
    boolean existsByBic(String bic);
    List<Banque> findByNomBanqueContainingIgnoreCase(String nom);
}