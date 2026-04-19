package com.gpi.gpi_backend.repository;

import com.gpi.gpi_backend.model.RecapMg;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RecapMgRepository extends JpaRepository<RecapMg, Long> {
    List<RecapMg> findByTypeMsg(String typeMsg);
    boolean existsByMessageId(String messageId);
    Optional<RecapMg> findByUetr(String uetr);
    Optional<RecapMg> findByMessageId(String messageId); // ✅ needed by Camt056Service
}