package com.example.visitor.repository;

import com.example.visitor.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Staff data comes from teaching_staffs table.
 * Class Incharges = staff_code appears in students.staff_code
 * NCI = staff_code NOT in students.staff_code
 */
@Repository
public interface StaffRepository extends JpaRepository<Staff, String> {

    Optional<Staff> findByStaffCode(String staffCode);

    List<Staff> findByStaffCodeIn(List<String> staffCodes);

    Optional<Staff> findByEmail(String email);

    List<Staff> findByDepartment(String department);

    Optional<Staff> findByStaffName(String staffName);

    @Query("SELECT s FROM Staff s WHERE LOWER(s.role) LIKE LOWER(CONCAT('%', :role, '%'))")
    List<Staff> findByRoleContainingIgnoreCase(@Param("role") String role);

    @Query("SELECT s FROM Staff s WHERE LOWER(s.staffName) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Staff> findByStaffNameContainingIgnoreCase(@Param("name") String name);

    // Check if a staff_code is a class incharge (appears in students.staff_code)
    @Query(value = "SELECT COUNT(*) FROM students WHERE staff_code = :staffCode", nativeQuery = true)
    long countClassInchargeByStaffCode(@Param("staffCode") String staffCode);

    default boolean isClassIncharge(String staffCode) {
        return countClassInchargeByStaffCode(staffCode) > 0;
    }

    // Get all class incharge staff codes from students table
    @Query(value = "SELECT DISTINCT staff_code FROM students WHERE staff_code IS NOT NULL", nativeQuery = true)
    List<String> findAllClassInchargeCodes();
}
