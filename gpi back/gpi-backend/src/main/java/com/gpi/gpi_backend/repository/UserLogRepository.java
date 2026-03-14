package com.gpi.gpi_backend.repository;

import com.gpi.gpi_backend.model.UserLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface UserLogRepository extends JpaRepository<UserLog, Long> {

    List<UserLog> findByUserIdOrderByDateDesc(Long userId);

    @Transactional
    void deleteByUserId(Long userId);
}