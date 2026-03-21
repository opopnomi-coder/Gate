package com.example.visitor.service;

import com.example.visitor.entity.Visitor;
import com.example.visitor.entity.QRTable;
import com.example.visitor.repository.VisitorRepository;
import com.example.visitor.repository.QRTableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class VisitorRequestService {
    
    @Autowired
    private VisitorRepository visitorRepository;
    
    @Autowired
    private QRTableRepository qrTableRepository;
    
    private static final String MANUAL_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom random = new SecureRandom();
    
    /**
     * Get all pending visitor requests for a specific staff member
     */
    public List<Visitor> getPendingVisitorRequestsForStaff(String staffCode) {
        return visitorRepository.findByStaffCodeAndStatus(staffCode, "PENDING");
    }
    
    /**
     * Get all visitor requests for a specific staff member (any status)
     */
    public List<Visitor> getAllVisitorRequestsForStaff(String staffCode) {
        return visitorRepository.findByStaffCode(staffCode);
    }
    
    /**
     * Generate QR code using existing format: VG|null|TOKEN
     */
    public String generateVisitorQRCode() {
        String token = generateRandomToken(8);
        return "VG|null|" + token;
    }
    
    /**
     * Generate manual entry code: 6-digit number (same as student/staff gate passes)
     */
    public String generateManualCode() {
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }
    
    /**
     * Generate random alphanumeric token
     */
    private String generateRandomToken(int length) {
        StringBuilder token = new StringBuilder();
        for (int i = 0; i < length; i++) {
            token.append(MANUAL_CODE_CHARS.charAt(random.nextInt(MANUAL_CODE_CHARS.length())));
        }
        return token.toString();
    }
    
    /**
     * Approve visitor request - generates QR and manual code, inserts into qr_table
     */
    public Visitor approveVisitorRequest(Long visitorId, String approvedBy) {
        Visitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new RuntimeException("Visitor not found"));
        
        if (!"PENDING".equals(visitor.getStatus())) {
            throw new RuntimeException("Visitor request is not pending");
        }
        
        // Generate QR code with VG|null|TOKEN format
        String qrCode = generateVisitorQRCode();
        String manualCode = generateManualCode();
        
        // Ensure manual code is unique
        while (visitorRepository.findByManualCode(manualCode).isPresent()) {
            manualCode = generateManualCode();
        }
        
        // Extract token from QR code (VG|null|TOKEN)
        String[] parts = qrCode.split("\\|");
        String token = parts.length >= 3 ? parts[2] : generateRandomToken(8);
        
        // Insert into qr_table for two-scan system
        // VG type: entry column has token, exit is null initially
        QRTable qrTable = new QRTable();
        qrTable.setQrCode(token);  // Store just the token
        qrTable.setUserType("VG");
        qrTable.setUserId(String.valueOf(visitorId));
        qrTable.setEntry(token);  // First scan will match this
        qrTable.setExit(null);    // Will be populated after first scan
        qrTable.setCreatedAt(LocalDateTime.now());
        
        // Set required fields for QRTable
        qrTable.setQrString(qrCode);  // Full QR code: VG|null|TOKEN
        qrTable.setRequestedByStaffCode(approvedBy);  // Staff who approved
        qrTable.setPassType("VISITOR");
        qrTable.setStudentCount(visitor.getNumberOfPeople());
        qrTable.setStatus("ACTIVE");
        
        qrTableRepository.save(qrTable);
        
        System.out.println("✅ QR Table entry created for visitor " + visitorId + " - Token: " + token + " (VG|null|" + token + ")");
        
        // Update visitor
        visitor.setStatus("APPROVED");
        visitor.setQrCode(qrCode);
        visitor.setManualCode(manualCode);
        visitor.setApprovedAt(LocalDateTime.now());
        visitor.setApprovedBy(approvedBy);
        visitor.setEmailStatus("PENDING");
        visitor.setScanCount(0);
        
        return visitorRepository.save(visitor);
    }
    
    /**
     * Reject visitor request
     */
    public Visitor rejectVisitorRequest(Long visitorId, String rejectionReason) {
        Visitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new RuntimeException("Visitor not found"));
        
        if (!"PENDING".equals(visitor.getStatus())) {
            throw new RuntimeException("Visitor request is not pending");
        }
        
        visitor.setStatus("REJECTED");
        visitor.setRejectedAt(LocalDateTime.now());
        visitor.setRejectionReason(rejectionReason);
        
        return visitorRepository.save(visitor);
    }
}
