package com.example.visitor.repository;

import com.example.visitor.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, String> {

    // Primary key is register_no (mapped as regNo)
    Optional<Student> findByRegNo(String regNo);

    @Query("SELECT s FROM Student s WHERE s.regNo IN :regNos")
    List<Student> findByRegNoIn(@Param("regNos") List<String> regNos);

    List<Student> findByDepartment(String department);

    // Students assigned to a specific class incharge by name
    List<Student> findByClassIncharge(String classIncharge);

    @Query("SELECT s FROM Student s WHERE LOWER(s.classIncharge) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Student> findByClassInchargeContaining(@Param("name") String name);

    @Query("SELECT s FROM Student s WHERE LOWER(s.classIncharge) LIKE LOWER(CONCAT('%', :name, '%')) AND s.department LIKE CONCAT('%', :deptKeyword, '%')")
    List<Student> findByClassInchargeContainingAndDepartment(@Param("name") String name, @Param("deptKeyword") String deptKeyword);

    @Query("SELECT s FROM Student s WHERE s.department = :department OR s.department LIKE CONCAT('%', :keyword, '%')")
    List<Student> findByDepartmentOrKeyword(@Param("department") String department, @Param("keyword") String keyword);

    // Students by class incharge staff_code (staff_code column = class incharge's code)
    List<Student> findByStaffCode(String staffCode);

    List<Student> findByDepartmentAndSection(String department, String section);

    // First-year students (semester 1 or 2) — HOD is always S&H HOD
    @Query("SELECT s FROM Student s WHERE s.semester IN (1, 2)")
    List<Student> findFirstYearStudents();

    // Check if a staff code is a class incharge
    @Query(value = "SELECT COUNT(*) FROM students WHERE staff_code = :staffCode", nativeQuery = true)
    long countClassInchargeByCode(@Param("staffCode") String staffCode);

    default boolean isClassIncharge(String staffCode) {
        return countClassInchargeByCode(staffCode) > 0;
    }

    // Count students by class incharge staff code
    @Query("SELECT COUNT(s) FROM Student s WHERE s.staffCode = :staffCode")
    long countByStaffCode(@Param("staffCode") String staffCode);

    // Count students by class incharge name (for HOD detection fallback)
    @Query("SELECT COUNT(s) FROM Student s WHERE LOWER(s.classIncharge) LIKE LOWER(CONCAT('%', :name, '%'))")
    long countByClassInchargeContaining(@Param("name") String name);

    // HOD is resolved from departments table — these are kept for backward compat
    @Query("SELECT DISTINCT s.department FROM Student s WHERE s.department IS NOT NULL")
    List<String> findAllDistinctDepartments();

    // Kept for backward compat — returns empty since hod column doesn't exist
    default List<String> findAllDistinctHodNames() { return java.util.Collections.emptyList(); }
    default long countByHodContaining(String name) { return 0L; }
}
