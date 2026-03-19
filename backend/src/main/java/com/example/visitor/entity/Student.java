package com.example.visitor.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "student")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // DB column: register_number
    @Column(name = "register_number", nullable = false, unique = true, length = 50)
    private String regNo;

    // DB column: name (full name — split for firstName/lastName compat)
    @Column(name = "name", nullable = false, length = 200)
    private String firstName;

    // lastName not a separate column in DB — kept transient for compat
    @Transient
    private String lastName;

    // DB column: email
    @Column(name = "email", nullable = false, length = 255)
    private String email;

    // DB column: contact_no
    @Column(name = "contact_no", length = 20)
    private String phone;

    // DB column: department
    @Column(length = 100)
    private String department;

    // DB column: year
    @Column(length = 20)
    private String year;

    // DB column: section
    @Column(length = 10)
    private String section;

    // DB column: class_incharge
    @Column(name = "class_incharge", length = 100)
    private String classIncharge;

    // DB column: hod
    @Column(name = "hod", length = 100)
    private String hod;

    // is_active not in DB — default true
    @Transient
    private boolean isActive = true;

    @Transient
    private LocalDateTime createdAt;

    @Transient
    private LocalDateTime updatedAt;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRegNo() { return regNo; }
    public void setRegNo(String regNo) { this.regNo = regNo; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getFullName() { return firstName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getYear() { return year; }
    public void setYear(String year) { this.year = year; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

    public String getClassIncharge() { return classIncharge; }
    public void setClassIncharge(String classIncharge) { this.classIncharge = classIncharge; }

    public String getHod() { return hod; }
    public void setHod(String hod) { this.hod = hod; }

    public boolean getIsActive() { return isActive; }
    public void setIsActive(boolean isActive) { this.isActive = isActive; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
