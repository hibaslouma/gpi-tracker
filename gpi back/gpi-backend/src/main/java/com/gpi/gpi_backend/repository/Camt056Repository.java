package com.gpi.gpi_backend.repository;

import com.gpi.gpi_backend.model.Camt056;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface Camt056Repository extends JpaRepository<Camt056, Long> {
    List<Camt056> findAllByOrderByCreatedAtDesc();
    Optional<Camt056> findByUetr(String uetr);
    boolean existsByMessageId(String messageId);
    Optional<Camt056> findTopByUetrOrderByCreatedAtDesc(String uetr);
    // ✅ needed by Camt029ParserService
    Optional<Camt056> findTopByOriginalMsgIdOrderByCreatedAtDesc(String originalMsgId);
}