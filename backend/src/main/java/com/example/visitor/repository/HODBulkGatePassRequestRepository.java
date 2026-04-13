package com.example.visitor.repository;

import com.example.visitor.entity.GatePassRequest;
import com.example.visitor.entity.GatePassRequest.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * HOD bulk gate pass requests are stored in the Gatepass table (pass_type='BULK').
 */
@Repository
public interface HODBulkGatePassRequestRepository extends JpaRepository<GatePassRequest, Long> {

    List<GatePassRequest> findByRequestedByStaffCodeAndPassTypeOrderByCreatedAtDesc(String hodCode, String passType);

    List<GatePassRequest> findByRequestedByStaffCodeAndPassTypeAndStatusOrderByCreatedAtDesc(String hodCode, String passType, RequestStatus status);

    List<GatePassRequest> findByPassTypeAndStatusOrderByCreatedAtDesc(String passType, RequestStatus status);

    @Query("SELECT r FROM GatePassRequest r WHERE r.id = :id AND r.passType = 'BULK'")
    Optional<GatePassRequest> findByIdWithParticipants(@Param("id") Long id);

    long countByPassTypeAndStatus(String passType, RequestStatus status);

    long countByRequestedByStaffCodeAndPassTypeAndStatus(String hodCode, String passType, RequestStatus status);

    // Convenience: find by hodCode (maps to requestedByStaffCode for bulk)
    default List<GatePassRequest> findByHodCodeOrderByCreatedAtDesc(String hodCode) {
        return findByRequestedByStaffCodeAndPassTypeOrderByCreatedAtDesc(hodCode, "BULK");
    }

    default List<GatePassRequest> findByStatusOrderByCreatedAtDesc(RequestStatus status) {
        return findByPassTypeAndStatusOrderByCreatedAtDesc("BULK", status);
    }

    default long countByStatus(RequestStatus status) {
        return countByPassTypeAndStatus("BULK", status);
    }
}
