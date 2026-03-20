package com.example.visitor.service;

import com.example.visitor.entity.ScanLog;
import com.example.visitor.entity.RailwayExitLog;
import com.example.visitor.entity.Staff;
import com.example.visitor.entity.Student;
import com.example.visitor.entity.HOD;
import com.example.visitor.entity.PersonType;
import com.example.visitor.entity.ApprovalStatus;
import com.example.visitor.entity.QRTable;
import com.example.visitor.repository.RailwayExitLogRepository;
import com.example.visitor.repository.HODRepository;
import com.example.visitor.repository.StaffRepository;
import com.example.visitor.repository.StudentRepository;
import com.example.visitor.repository.QRTableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GroupPassService {
    
    @Autowired
    private StudentRepository studentRepository;
    
    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private HODRepository hodRepository;
    
    @Autowired
    private QRTableRepository qrTableRepository;

    @Autowired
    private RailwayExitLogRepository railwayExitLogRepository;
    
    @Transactional
    public Map<String, Object> processGroupPassQR(String qrData, String scannedBy) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Step 1: Verify prefix
            if (!qrData.startsWith("GP|")) {
                throw new IllegalArgumentException("Invalid QR format: Must start with GP|");
            }
            
            // Step 2: Parse QR code
            GroupPassData passData = parseGroupPassQR(qrData);
            
            // Step 3: Check qr_table for token (stored in qr_code column)
            Optional<QRTable> qrTableEntry = qrTableRepository.findByToken(passData.randomToken);
            
            if (!qrTableEntry.isPresent()) {
                // Token not found - already used or invalid
                return handleInvalidPass(qrData, scannedBy, "Pass not found or already used");
            }
            
            QRTable qrRecord = qrTableEntry.get();
            
            // Step 4: Validate - check if pass is still active
            if (!"ACTIVE".equals(qrRecord.getStatus())) {
                return handleInvalidPass(qrData, scannedBy, "Pass has already been used");
            }
            
            // Verify the token matches
            if (qrRecord.getQrCode() == null || !qrRecord.getQrCode().equals(passData.randomToken)) {
                return handleInvalidPass(qrData, scannedBy, "Token mismatch");
            }
            
            // Step 5: Process single scan - delete row immediately (like ST/SF)
            return processSingleScan(qrData, passData, qrRecord, scannedBy);
            
        } catch (Exception e) {
            System.err.println("Error processing Group Pass QR: " + e.getMessage());
            e.printStackTrace();
            return handleInvalidPass(qrData, scannedBy, e.getMessage());
        }
    }
    
    private Map<String, Object> processSingleScan(String qrData, GroupPassData passData, QRTable qrRecord, String scannedBy) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Fetch member details
            MemberDetails members = fetchMemberDetails(passData);
            
            // Calculate total persons
            int totalPersons = calculateTotalPersons(passData, members);
            
            // Bulk/group pass QR represents an EXIT-only workflow in this app.
            // Exit history must be written to Exit_logs (not Entry table).
            LocalDateTime exitTime = LocalDateTime.now();
            List<Long> exitLogIds = new ArrayList<>();
            Long qrId = qrRecord.getId();
            boolean inchargeIsHod = hodRepository.findByHodCode(passData.inchargeStaffId).isPresent();

            // Students exit logs
            for (String studentRegNo : passData.studentRolls) {
                RailwayExitLog exitLog = new RailwayExitLog();
                exitLog.setQrId(qrId);
                exitLog.setUserId(studentRegNo);
                exitLog.setUserType("STUDENT");
                exitLog.setExitTime(exitTime);
                exitLog.setVerifiedBy(scannedBy != null ? scannedBy : "Security Guard");
                exitLog.setLocation("Exit Gate");
                exitLog.setQrCode(qrData);
                exitLog.setScanLocation("Exit Gate");
                exitLog.setAccessGranted(true);
                RailwayExitLog saved = railwayExitLogRepository.save(exitLog);
                exitLogIds.add(saved.getId());
            }

            // Staff exit logs
            for (String staffCode : passData.staffIds) {
                RailwayExitLog exitLog = new RailwayExitLog();
                exitLog.setQrId(qrId);
                exitLog.setUserId(staffCode);
                exitLog.setUserType("STAFF");
                exitLog.setExitTime(exitTime);
                exitLog.setVerifiedBy(scannedBy != null ? scannedBy : "Security Guard");
                exitLog.setLocation("Exit Gate");
                exitLog.setQrCode(qrData);
                exitLog.setScanLocation("Exit Gate");
                exitLog.setAccessGranted(true);
                RailwayExitLog saved = railwayExitLogRepository.save(exitLog);
                exitLogIds.add(saved.getId());
            }

            // SIG: include incharge as a participant exit log.
            if ("SIG".equals(passData.subtype)) {
                RailwayExitLog exitLog = new RailwayExitLog();
                exitLog.setQrId(qrId);
                exitLog.setUserId(passData.inchargeStaffId);
                exitLog.setUserType(inchargeIsHod ? "HOD" : "STAFF");
                exitLog.setExitTime(exitTime);
                exitLog.setVerifiedBy(scannedBy != null ? scannedBy : "Security Guard");
                exitLog.setLocation("Exit Gate");
                exitLog.setQrCode(qrData);
                exitLog.setScanLocation("Exit Gate");
                exitLog.setAccessGranted(true);
                RailwayExitLog saved = railwayExitLogRepository.save(exitLog);
                exitLogIds.add(saved.getId());
            }

            // Consume QR exactly once (one-time gatepass rule).
            qrTableRepository.delete(qrRecord);
            
            // Build success response
            result.put("status", "VALID");
            result.put("scanEvent", "EXIT");
            result.put("passType", "GROUP_PASS");
            result.put("passSubtype", passData.subtype);
            result.put("inchargeName", members.inchargeName);
            result.put("inchargeStaffId", passData.inchargeStaffId);
            result.put("studentNames", members.studentNamesCSV);
            result.put("staffNames", members.staffNamesCSV);
            result.put("totalPersons", totalPersons);
            result.put("scannedAt", exitTime);
            result.put("message", "EXIT SUCCESS");
            result.put("id", exitLogIds.isEmpty() ? null : exitLogIds.get(0));
            
            System.out.println("✅ Group Pass EXIT processed (single scan): " + passData.randomToken + " - " + totalPersons + " persons - Status: USED");
            
        } catch (Exception e) {
            System.err.println("Error processing single scan: " + e.getMessage());
            throw e;
        }
        
        return result;
    }
    
    private Map<String, Object> handleInvalidPass(String qrData, String scannedBy, String errorMessage) {
        Map<String, Object> result = new HashMap<>();
        result.put("status", "INVALID");
        result.put("message", "PASS ALREADY USED");
        result.put("errorMessage", errorMessage);

        // Do not write invalid attempts to Entry table.
        // Exit history must only be written to Exit_logs when an actual exit occurs.
        return result;
    }
    
    private GroupPassData parseGroupPassQR(String qrData) {
        // Split by '|'
        String[] parts = qrData.split("\\|");
        if (parts.length < 4 || parts.length > 5) {
            throw new IllegalArgumentException("Invalid QR format: Expected 4 or 5 parts, got " + parts.length);
        }
        
        GroupPassData data = new GroupPassData();
        data.inchargeStaffId = parts[1].trim();
        
        if (parts.length == 5) {
            // 5-part format: GP|incharge|students|staff|subtype:token
            data.studentRollString = parts[2].trim();
            data.staffIdString = parts[3].trim();
            data.subtypeAndToken = parts[4].trim();
        } else {
            // 4-part format: GP|incharge|members|subtype:token
            // Need to determine if part[2] is students or staff
            String membersString = parts[2].trim();
            data.subtypeAndToken = parts[3].trim();
            
            // Parse members to determine type
            List<String> members = parseCommaSeparated(membersString);
            
            if (!members.isEmpty()) {
                // Check first member to determine type
                String firstMember = members.get(0);
                
                // Student IDs are typically numeric (e.g., 2117240030007)
                // Staff IDs are typically alphanumeric (e.g., AD121, ST001)
                if (firstMember.matches("^\\d+$")) {
                    // All numeric - likely students
                    data.studentRollString = membersString;
                    data.staffIdString = "";
                } else {
                    // Contains letters - likely staff
                    data.studentRollString = "";
                    data.staffIdString = membersString;
                }
            } else {
                data.studentRollString = "";
                data.staffIdString = "";
            }
        }
        
        // Parse subtype and token
        String[] subtypeParts = data.subtypeAndToken.split(":");
        if (subtypeParts.length != 2) {
            throw new IllegalArgumentException("Invalid subtype format");
        }
        
        data.subtype = subtypeParts[0].trim();
        data.randomToken = subtypeParts[1].trim();
        
        if (data.randomToken.isEmpty()) {
            throw new IllegalArgumentException("Token missing");
        }
        
        // Parse lists
        data.studentRolls = parseCommaSeparated(data.studentRollString);
        data.staffIds = parseCommaSeparated(data.staffIdString);
        
        // Validation
        if (data.studentRolls.isEmpty() && data.staffIds.isEmpty()) {
            throw new IllegalArgumentException("Both student and staff lists are empty");
        }
        
        if (!"SIG".equals(data.subtype) && !"SEG".equals(data.subtype)) {
            throw new IllegalArgumentException("Invalid subtype: " + data.subtype);
        }
        
        System.out.println("📋 Parsed QR - Students: " + data.studentRolls.size() + ", Staff: " + data.staffIds.size());
        
        return data;
    }
    
    private MemberDetails fetchMemberDetails(GroupPassData passData) {
        MemberDetails details = new MemberDetails();
        
        // Fetch incharge (staff OR HOD)
        Optional<Staff> inchargeOpt = staffRepository.findByStaffCode(passData.inchargeStaffId);
        if (inchargeOpt.isPresent()) {
            details.inchargeName = inchargeOpt.get().getStaffName();
        } else {
            Optional<HOD> hodOpt = hodRepository.findByHodCode(passData.inchargeStaffId);
            if (hodOpt.isPresent()) {
                details.inchargeName = hodOpt.get().getHodName();
            } else {
                throw new IllegalArgumentException("Incharge not found (staff or HOD): " + passData.inchargeStaffId);
            }
        }
        
        // Fetch students
        if (!passData.studentRolls.isEmpty()) {
            List<Student> students = studentRepository.findByRegNoIn(passData.studentRolls);
            Map<String, String> rollToName = students.stream()
                    .collect(Collectors.toMap(Student::getRegNo, 
                        s -> (s.getFirstName() + " " + (s.getLastName() != null ? s.getLastName() : "")).trim()));
            
            details.studentNamesCSV = passData.studentRolls.stream()
                    .map(roll -> rollToName.getOrDefault(roll, "Unknown"))
                    .collect(Collectors.joining(", "));
            
            List<String> studentDetails = new ArrayList<>();
            for (String roll : passData.studentRolls) {
                String name = rollToName.getOrDefault(roll, "Unknown");
                studentDetails.add(roll + ":" + name);
            }
            details.studentDetailsJSON = String.join("|", studentDetails);
        }
        
        // Fetch staff
        if (!passData.staffIds.isEmpty()) {
            List<Staff> staffMembers = staffRepository.findByStaffCodeIn(passData.staffIds);
            Map<String, String> idToName = staffMembers.stream()
                    .collect(Collectors.toMap(Staff::getStaffCode, Staff::getStaffName));
            
            details.staffNamesCSV = passData.staffIds.stream()
                    .map(id -> id + " - " + idToName.getOrDefault(id, "Unknown"))
                    .collect(Collectors.joining(", "));
            
            List<String> staffDetails = new ArrayList<>();
            for (String id : passData.staffIds) {
                String name = idToName.getOrDefault(id, "Unknown");
                staffDetails.add(id + ":" + name);
            }
            details.staffDetailsJSON = String.join("|", staffDetails);
        }
        
        return details;
    }
    
    private int calculateTotalPersons(GroupPassData passData, MemberDetails members) {
        int studentsCount = passData.studentRolls.size();
        int staffCount = passData.staffIds.size();
        
        if ("SIG".equals(passData.subtype)) {
            return studentsCount + staffCount + 1; // Include incharge
        } else {
            return studentsCount + staffCount; // Exclude incharge
        }
    }
    
    private ScanLog createScanLog(String qrData, GroupPassData passData, MemberDetails members, 
                                   int totalPersons, String scanEvent, String scannedBy) {
        ScanLog scanLog = new ScanLog();
        scanLog.setQrCode(qrData);
        scanLog.setPersonName("GROUP PASS (" + totalPersons + " persons)");
        scanLog.setPersonType(PersonType.BULK_PASS);
        scanLog.setStatus(ApprovalStatus.APPROVED);
        scanLog.setAccessGranted(true);
        scanLog.setScannedBy(scannedBy);
        scanLog.setScanLocation("Main Gate");
        scanLog.setUserId(passData.inchargeStaffId);
        scanLog.setUserType("GP");
        
        // Store group details in purpose field
        StringBuilder purposeBuilder = new StringBuilder();
        purposeBuilder.append("TOKEN:").append(passData.randomToken);
        purposeBuilder.append("||INCHARGE:").append(passData.inchargeStaffId).append(":").append(members.inchargeName);
        purposeBuilder.append("||TYPE:").append("SIG".equals(passData.subtype) ? "Staff Included Group" : "Staff Excluded Group");
        purposeBuilder.append("||TOTAL:").append(totalPersons);
        
        if (members.studentDetailsJSON != null) {
            purposeBuilder.append("||STUDENTS:").append(members.studentDetailsJSON);
        }
        if (members.staffDetailsJSON != null) {
            purposeBuilder.append("||STAFF:").append(members.staffDetailsJSON);
        }
        
        scanLog.setPurpose(purposeBuilder.toString());
        scanLog.setStudentId(passData.studentRolls.isEmpty() ? null : String.join(",", passData.studentRolls));
        scanLog.setFacultyId(passData.inchargeStaffId);
        
        return scanLog;
    }
    
    private List<String> parseCommaSeparated(String input) {
        if (input == null || input.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return Arrays.stream(input.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }
    
    // Inner classes for data structures
    private static class GroupPassData {
        String inchargeStaffId;
        String studentRollString;
        String staffIdString;
        String subtypeAndToken;
        String subtype;
        String randomToken;
        List<String> studentRolls;
        List<String> staffIds;
    }
    
    private static class MemberDetails {
        String inchargeName;
        String studentNamesCSV;
        String staffNamesCSV;
        String studentDetailsJSON;
        String staffDetailsJSON;
    }
}
