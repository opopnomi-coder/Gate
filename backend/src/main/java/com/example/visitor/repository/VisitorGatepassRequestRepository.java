package com.example.visitor.repository;

import com.example.visitor.entity.Visitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Visitor gate pass requests are stored in the Visitor table.
 */
@Repository
public interface VisitorGatepassRequestRepository extends JpaRepository<Visitor, Long> {

    List<Visitor> findByStaffCode(String staffCode);

    List<Visitor> findByStaffCodeAndStatus(String staffCode, String status);

    @Query("SELECT v FROM Visitor v WHERE v.staffCode = :staffId AND v.status = 'PENDING' ORDER BY v.createdAt DESC")
    List<Visitor> findPendingRequestsForStaff(@Param("staffId") String staffId);

    List<Visitor> findByStatus(String status);

    List<Visitor> findByDepartment(String department);

    List<Visitor> findByVisitDate(LocalDate visitDate);

    Visitor findByQrCode(String qrCode);

    // Compat methods mapping old field names
    default List<Visitor> findByAssignedStaffId(String staffId) {
        return findByStaffCode(staffId);
    }

    default List<Visitor> findByAssignedStaffIdAndRequestStatus(String staffId, String status) {
        return findByStaffCodeAndStatus(staffId, status);
    }

    default List<Visitor> findByRequestStatus(String status) {
        return findByStatus(status);
    }

    default Visitor findByQrCodeData(String qrCode) {
        return findByQrCode(qrCode);
    }
}
