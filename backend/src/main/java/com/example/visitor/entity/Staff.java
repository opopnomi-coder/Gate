package com.example.visitor.entity;

import jakarta.persistence.*;

/**
 * teaching_staffs table — covers STAFF and NCI roles.
 * Columns: name, staff_code, department, designation, email, phone
 */
@Entity
@Table(name = "teaching_staffs")
public class Staff {
    @Id
    @Column(name = "staff_code", nullable = false, unique = true, length = 50)
    private String staffCode;

    @Column(name = "name", nullable = false, length = 200)
    private String staffName;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "designation", length = 100)
    private String role;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Transient private boolean isActive = true;

    public String getId() { return staffCode; }
    public void setId(String id) { this.staffCode = id; }
    public String getStaffCode() { return staffCode; }
    public void setStaffCode(String staffCode) { this.staffCode = staffCode; }
    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public boolean getIsActive() { return true; }
    public void setIsActive(boolean isActive) { this.isActive = isActive; }
    public String getPassword() { return null; }
    public void setPassword(String p) {}
}
