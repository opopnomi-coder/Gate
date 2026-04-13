package com.example.visitor.repository;

import com.example.visitor.entity.GatePassRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Participants are stored as comma-separated lists in Gatepass.student_list / staff_list.
 * This repository delegates to GatePassRequest.
 */
@Repository
public interface HODBulkPassParticipantRepository extends JpaRepository<GatePassRequest, Long> {
}
