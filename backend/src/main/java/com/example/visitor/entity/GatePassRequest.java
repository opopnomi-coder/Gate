package com.example.visitor.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "Gatepass")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GatePassRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "reg_no", nullable = false)
    private String regNo; // Student regNo or Staff staffCode
    
    @Column(name = "student_name")
    private String studentName;
    
    @Column(name = "department")
    private String department;
    
    @Column(name = "purpose", nullable = false)
    private String purpose;
    
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;
    
    @Column(name = "request_date")
    private LocalDateTime requestDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RequestStatus status = RequestStatus.PENDING;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "staff_approval", nullable = false)
    private ApprovalStatus staffApproval = ApprovalStatus.PENDING;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "hod_approval", nullable = false)
    private ApprovalStatus hodApproval = ApprovalStatus.PENDING;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "hr_approval", nullable = false)
    private ApprovalStatus hrApproval = ApprovalStatus.PENDING;
    
    @Column(name = "assigned_staff_code")
    private String assignedStaffCode;
    
    @Column(name = "assigned_hod_code")
    private String assignedHodCode;
    
    @Column(name = "assigned_hr_code")
    private String assignedHrCode;
    
    @Column(name = "staff_approved_by")
    private String staffApprovedBy;
    
    @Column(name = "staff_approval_date")
    private LocalDateTime staffApprovalDate;
    
    @Column(name = "hod_approved_by")
    private String hodApprovedBy;
    
    @Column(name = "hod_approval_date")
    private LocalDateTime hodApprovalDate;
    
    @Column(name = "hr_approved_by")
    private String hrApprovedBy;
    
    @Column(name = "hr_approval_date")
    private LocalDateTime hrApprovalDate;
    
    @Column(name = "staff_remark", columnDefinition = "TEXT")
    private String staffRemark;
    
    @Column(name = "hod_remark", columnDefinition = "TEXT")
    private String hodRemark;

    @Column(name = "hr_remark", columnDefinition = "TEXT")
    private String hrRemark;
    
    @Column(name = "rejected_by")
    private String rejectedBy;
    
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;
    
    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;
    
    @Column(name = "qr_code", columnDefinition = "TEXT")
    private String qrCode; // Base64 QR image
    
    @Column(name = "manual_code", length = 10)
    private String manualCode; // Manual entry code for typing instead of scanning
    
    @Column(name = "qr_code_generated_at")
    private LocalDateTime qrCodeGeneratedAt;
    
    @Column(name = "qr_used")
    private Boolean qrUsed = false;
    
    @Column(name = "qr_used_at")
    private LocalDateTime qrUsedAt;
    
    @Column(name = "pass_type")
    private String passType = "SINGLE"; // SINGLE, BULK
    
    @Column(name = "bulk_type")
    private String bulkType; // BULK_INCLUDE_STAFF, BULK_EXCLUDE_STAFF
    
    @Column(name = "include_staff")
    private Boolean includeStaff = false;
    
    @Column(name = "student_count")
    private Integer studentCount = 1;
    
    @Column(name = "student_list", columnDefinition = "TEXT")
    private String studentList; // Comma-separated list of student reg numbers for bulk passes
    
    @Column(name = "staff_list", columnDefinition = "TEXT")
    private String staffList; // Comma-separated list of staff codes for bulk passes
    
    @Column(name = "qr_owner_id")
    private String qrOwnerId; // ID of person who receives the QR code
    
    @Column(name = "receiver_id")
    private String receiverId; // Selected receiver when includeStaff = false
    
    @Column(name = "user_type")
    private String userType = "STUDENT"; // STUDENT, STAFF
    
    @Column(name = "attachment_uri", columnDefinition = "MEDIUMTEXT")
    private String attachmentUri; // Supports up to 16MB files
    
    @Column(name = "requested_by_staff_code")
    private String requestedByStaffCode; // For bulk passes
    
    @Column(name = "requested_by_staff_name")
    private String requestedByStaffName;
    
    @Column(name = "exit_date_time")
    private LocalDateTime exitDateTime;
    
    @Column(name = "return_date_time")
    private LocalDateTime returnDateTime;
    
    @Column(name = "request_submitted_at")
    private LocalDateTime requestSubmittedAt;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (requestDate == null) {
            requestDate = LocalDateTime.now();
        }
        if (requestSubmittedAt == null) {
            requestSubmittedAt = LocalDateTime.now();
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Enums
    public enum RequestStatus {
        PENDING,
        PENDING_STAFF,
        PENDING_HOD,
        PENDING_HR,
        APPROVED,
        REJECTED
    }
    
    public enum ApprovalStatus {
        PENDING,
        APPROVED,
        REJECTED
    }
    
    // Constructor for basic request
    public GatePassRequest(String regNo, String studentName, String department, 
                          String purpose, String reason, LocalDateTime requestDate) {
        this.regNo = regNo;
        this.studentName = studentName;
        this.department = department;
        this.purpose = purpose;
        this.reason = reason;
        this.requestDate = requestDate;
        this.status = RequestStatus.PENDING;
        this.staffApproval = ApprovalStatus.PENDING;
        this.hodApproval = ApprovalStatus.PENDING;
    }
}
