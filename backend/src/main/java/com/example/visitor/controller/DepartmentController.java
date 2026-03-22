package com.example.visitor.controller;

import com.example.visitor.repository.StaffRepository;
import com.example.visitor.repository.StudentRepository;
import com.example.visitor.util.DepartmentMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/departments")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class DepartmentController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private StudentRepository studentRepository;

    // Get all departments — uses native SQL to avoid JPA @Id null issue on department_summary
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllDepartments() {
        try {
            List<Map<String, Object>> departmentList = jdbcTemplate.queryForList(
                "SELECT department_name, total_staff, total_student FROM department_summary WHERE department_name IS NOT NULL AND department_name != ''"
            ).stream().map(row -> {
                String name = (String) row.get("department_name");
                Map<String, Object> map = new HashMap<>();
                map.put("id", name);
                map.put("name", name);
                map.put("code", name);
                map.put("totalStaff", row.get("total_staff"));
                map.put("totalStudents", row.get("total_student"));
                return map;
            }).collect(Collectors.toList());

            System.out.println("Fetched " + departmentList.size() + " departments from department_summary");
            return ResponseEntity.ok(departmentList);
        } catch (Exception e) {
            System.err.println("Error fetching departments: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // Get department by code
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getDepartmentById(@PathVariable String id) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT department_name, total_staff, total_student FROM department_summary WHERE department_name = ?", id
            );
            if (rows.isEmpty()) return ResponseEntity.notFound().build();
            String name = (String) rows.get(0).get("department_name");
            Map<String, Object> map = new HashMap<>();
            map.put("id", name);
            map.put("name", name);
            map.put("code", name);
            return ResponseEntity.ok(map);
        } catch (Exception e) {
            System.err.println("Error fetching department: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }


    // Get staff by department code — uses /staff-list suffix to avoid path conflict with /{id}
    @GetMapping("/{departmentCode}/staff-list")
    public ResponseEntity<List<Map<String, Object>>> getStaffByDepartment(@PathVariable String departmentCode) {
        try {
            System.out.println("Fetching staff for department: " + departmentCode);
            
            // Convert to the exact format used in staff.department column
            String searchDept = DepartmentMapper.toStaffDeptFormat(departmentCode);
            System.out.println("Resolved search department to staff format: " + searchDept);

            // Get staff from the Staff repository only
            List<com.example.visitor.entity.Staff> staffList = staffRepository.findByDepartment(searchDept);

            // Build a set of HOD names from the students table
            java.util.Set<String> hodNames = new java.util.HashSet<>(studentRepository.findAllDistinctHodNames());

            List<Map<String, Object>> staffData = staffList.stream()
                .map(staff -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", staff.getStaffCode());
                    map.put("staffCode", staff.getStaffCode());
                    map.put("name", staff.getStaffName());
                    map.put("email", staff.getEmail());
                    map.put("phone", staff.getPhone());
                    map.put("department", staff.getDepartment());
                    // Determine role: HOD if name matches students.hod, else HR if role contains HR, else Faculty
                    String role;
                    if (staff.getStaffName() != null && hodNames.contains(staff.getStaffName().trim())) {
                        role = "HOD";
                    } else if (staff.getRole() != null && staff.getRole().toUpperCase().contains("HR")) {
                        role = "HR";
                    } else {
                        role = staff.getRole() != null && !staff.getRole().isBlank() ? staff.getRole() : "Faculty";
                    }
                    map.put("role", role);
                    return map;
                })
                .collect(Collectors.toList());

            System.out.println("Found " + staffData.size() + " staff members in department " + searchDept);
            return ResponseEntity.ok(staffData);
        } catch (Exception e) {
            System.err.println("Error fetching staff for department: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

}
