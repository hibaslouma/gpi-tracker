package com.gpi.gpi_backend.repository;

import com.gpi.gpi_backend.model.RecapMg;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecapMgRepository extends JpaRepository<RecapMg, Long> {
    List<RecapMg> findByFileName(String fileName);
    boolean existsByMessageId(String messageId);
}