package com.example.visitor.repository;

import com.example.visitor.entity.HOD;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * HOD data comes from the departments table.
 * staff_code = HOD's login code, hod = HOD name, name = department name.
 */
@Repository
public interface HODRepository extends JpaRepository<HOD, String> {

    // Primary key is staff_code (mapped as hodCode)
    Optional<HOD> findByHodCode(String hodCode);

    // Find by department name
    Optional<HOD> findByDepartment(String department);

    // Find all HODs for a department (returns list for SecurityController compat)
    @Query("SELECT h FROM HOD h WHERE LOWER(h.department) = LOWER(:department)")
    List<HOD> findAllByDepartment(@Param("department") String department);

    // All HODs (one per department)
    @Query("SELECT h FROM HOD h WHERE h.hodCode IS NOT NULL")
    List<HOD> findAllHODs();

    // Check if a staff_code is a HOD
    @Query("SELECT COUNT(h) FROM HOD h WHERE h.hodCode = :staffCode")
    long countByHodCode(@Param("staffCode") String staffCode);

    default boolean isHOD(String staffCode) {
        return countByHodCode(staffCode) > 0;
    }

    // Find HOD by department name (case-insensitive)
    @Query("SELECT h FROM HOD h WHERE LOWER(h.department) = LOWER(:department)")
    Optional<HOD> findByDepartmentIgnoreCase(@Param("department") String department);

    // S&H HOD — used for all first-year students
    @Query("SELECT h FROM HOD h WHERE h.department = 'S & H'")
    Optional<HOD> findSHHod();
}
