package com.gpi.gpi_backend.repository;

import com.gpi.gpi_backend.model.Parametrage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ParametrageRepository
        extends JpaRepository<Parametrage, Long> {
}