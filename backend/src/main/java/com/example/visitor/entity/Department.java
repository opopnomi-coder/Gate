package com.example.visitor.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "department_summary")
public class Department {

    // department_summary has no PK — use department_name as logical PK
    @Id
    @Column(name = "department_name")
    private String name;

    @Column(name = "total_staff")
    private Integer totalStaff;

    @Column(name = "total_student")
    private Integer totalStudents;

    public Department() {}

    public Department(String name) { this.name = name; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    // Alias methods used elsewhere
    public String getCode() { return name; }
    public String getDepartmentCode() { return name; }
    public String getDepartmentName() { return name; }

    public Integer getTotalStaff() { return totalStaff; }
    public void setTotalStaff(Integer totalStaff) { this.totalStaff = totalStaff; }

    public Integer getTotalStudents() { return totalStudents; }
    public void setTotalStudents(Integer totalStudents) { this.totalStudents = totalStudents; }

    public Boolean getIsActive() { return true; }
}
