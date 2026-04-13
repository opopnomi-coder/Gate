package com.example.visitor.repository;

import com.example.visitor.entity.HR;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * HR and AO data comes from non_teaching_staffs table.
 * HR  = designation 'Senior Manager - HR'
 * AO  = designation 'Administrative Officer'
 */
@Repository
public interface HRRepository extends JpaRepository<HR, String> {

    // Primary key is staff_code (mapped as hrCode)
    Optional<HR> findByHrCode(String hrCode);

    Optional<HR> findByEmail(String email);

    boolean existsByHrCode(String hrCode);

    // Find all HR staff (Senior Manager - HR)
    @Query("SELECT h FROM HR h WHERE h.role = 'Senior Manager - HR'")
    List<HR> findAllHR();

    // Find all AO staff (Administrative Officer)
    @Query("SELECT h FROM HR h WHERE h.role = 'Administrative Officer'")
    List<HR> findAllAO();

    // Check if a staff_code is HR or AO
    @Query("SELECT COUNT(h) FROM HR h WHERE h.hrCode = :staffCode AND (h.role = 'Senior Manager - HR' OR h.role = 'Administrative Officer')")
    long countHRorAO(@Param("staffCode") String staffCode);

    default boolean isHRorAO(String staffCode) {
        return countHRorAO(staffCode) > 0;
    }

    // Find by designation
    List<HR> findByRole(String role);
}
