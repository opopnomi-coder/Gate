package com.example.visitor.repository;

import com.example.visitor.entity.HR;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HRRepository extends JpaRepository<HR, Long> {

    // hrCode maps to staff_code column
    Optional<HR> findByHrCode(String hrCode);

    Optional<HR> findByEmail(String email);

    boolean existsByHrCode(String hrCode);

    boolean existsByEmail(String email);

    List<HR> findByIsActive(boolean isActive);
}
