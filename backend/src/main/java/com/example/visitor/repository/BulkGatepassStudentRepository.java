package com.example.visitor.repository;

import com.example.visitor.entity.GatePassRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Bulk gatepass students are stored as comma-separated reg_nos in Gatepass.student_list.
 */
@Repository
public interface BulkGatepassStudentRepository extends JpaRepository<GatePassRequest, Long> {

    @Query("SELECT g FROM GatePassRequest g WHERE g.passType = 'BULK' AND g.id = :passRequestId")
    List<GatePassRequest> findByPassRequestId(@Param("passRequestId") Long passRequestId);

    @Query("SELECT g FROM GatePassRequest g WHERE g.passType = 'BULK' AND FIND_IN_SET(:regNo, g.studentList) > 0")
    List<GatePassRequest> findByRegNo(@Param("regNo") String regNo);

    @Query("SELECT COUNT(g) FROM GatePassRequest g WHERE g.passType = 'BULK' AND g.id = :passRequestId")
    long countByPassRequestId(@Param("passRequestId") Long passRequestId);
}
