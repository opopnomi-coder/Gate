package com.example.visitor.entity;

/**
 * Bulk gatepass students are stored as comma-separated reg_nos in Gatepass.student_list.
 * This class is kept for backward compatibility only — not mapped to any table.
 */
public class BulkGatepassStudent {
    private Long id;
    private Long passRequestId;
    private String regNo;

    public BulkGatepassStudent() {}
    public BulkGatepassStudent(Long passRequestId, String regNo) {
        this.passRequestId = passRequestId;
        this.regNo = regNo;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPassRequestId() { return passRequestId; }
    public void setPassRequestId(Long passRequestId) { this.passRequestId = passRequestId; }
    public String getRegNo() { return regNo; }
    public void setRegNo(String regNo) { this.regNo = regNo; }
}
