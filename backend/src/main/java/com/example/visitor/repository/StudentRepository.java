package com.example.visitor.repository;

import com.example.visitor.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    // regNo field maps to register_number column
    Optional<Student> findByRegNo(String regNo);

    @Query("SELECT s FROM Student s WHERE s.regNo IN :regNos")
    List<Student> findByRegNoIn(@Param("regNos") List<String> regNos);

    List<Student> findByDepartment(String department);

    // Find students by department using LIKE — handles format mismatches
    // e.g. staff has "AI & ML", students have "B.E. CSE (AI & ML)"
    @Query("SELECT s FROM Student s WHERE s.department = :department OR s.department LIKE CONCAT('%', :keyword, '%')")
    List<Student> findByDepartmentOrKeyword(@Param("department") String department, @Param("keyword") String keyword);

    // Students assigned to a specific class incharge (exact name match)
    List<Student> findByClassIncharge(String classIncharge);

    // Case-insensitive contains match for class incharge name (no department filter — handles dept format mismatch)
    @Query("SELECT s FROM Student s WHERE LOWER(s.classIncharge) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Student> findByClassInchargeContaining(@Param("name") String name);

    // Case-insensitive contains match for class incharge name within department (LIKE on both)
    @Query("SELECT s FROM Student s WHERE LOWER(s.classIncharge) LIKE LOWER(CONCAT('%', :name, '%')) AND s.department LIKE CONCAT('%', :deptKeyword, '%')")
    List<Student> findByClassInchargeContainingAndDepartment(@Param("name") String name, @Param("deptKeyword") String deptKeyword);

    // Fallback: students by department and section
    List<Student> findByDepartmentAndSection(String department, String section);

    // Get the HOD name for a department (hod column stores the HOD's name)
    @Query("SELECT DISTINCT s.hod FROM Student s WHERE s.department = :department AND s.hod IS NOT NULL")
    List<String> findHodNamesByDepartment(@Param("department") String department);

    // HOD lookup via LIKE — handles format mismatch (e.g. staff dept "AI & ML" vs student dept "B.E. CSE (AI & ML)")
    @Query("SELECT DISTINCT s.hod FROM Student s WHERE s.department LIKE CONCAT('%', :keyword, '%') AND s.hod IS NOT NULL")
    List<String> findHodNamesByDepartmentKeyword(@Param("keyword") String keyword);

    // Get all distinct HOD names across all departments
    @Query("SELECT DISTINCT s.hod FROM Student s WHERE s.hod IS NOT NULL AND s.hod <> ''")
    List<String> findAllDistinctHodNames();
}
