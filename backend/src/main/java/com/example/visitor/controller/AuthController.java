package com.example.visitor.controller;

import com.example.visitor.entity.SecurityPersonnel;
import com.example.visitor.entity.Student;
import com.example.visitor.entity.Staff;
import com.example.visitor.entity.HOD;
import com.example.visitor.entity.HR;
import com.example.visitor.dto.UserResponseDTO;
import com.example.visitor.repository.ClassInchargeRepository;
import com.example.visitor.repository.SecurityPersonnelRepository;
import com.example.visitor.repository.StudentRepository;
import com.example.visitor.repository.StaffRepository;
import com.example.visitor.repository.HODRepository;
import com.example.visitor.repository.HRRepository;
import com.example.visitor.service.EmailService;
import com.example.visitor.util.DepartmentMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@Slf4j
public class AuthController {
    
    @Autowired
    private SecurityPersonnelRepository securityPersonnelRepository;
    
    @Autowired
    private StudentRepository studentRepository;
    
    @Autowired
    private StaffRepository staffRepository;
    
    @Autowired
    private HODRepository hodRepository;
    
    @Autowired
    private HRRepository hrRepository;
    
    @Autowired
    private EmailService emailService;

    @Autowired
    private ClassInchargeRepository classInchargeRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    
    // Configuration values
    @Value("${auth.otp.expiry.minutes:5}")
    private int otpExpiryMinutes;
    
    @Value("${auth.otp.max.attempts:3}")
    private int maxOTPAttempts;
    
    @Value("${auth.rate.limit.seconds:60}")
    private int rateLimitSeconds;
    
    // In-memory storage (in production, use Redis)
    private final Map<String, String> otpStore = new ConcurrentHashMap<>();
    private final Map<String, Long> otpTimestamp = new ConcurrentHashMap<>();
    private final Map<String, Long> otpExpiry = new ConcurrentHashMap<>();
    private final Map<String, Integer> otpAttempts = new ConcurrentHashMap<>();
    private final Map<String, Long> lastOTPRequest = new ConcurrentHashMap<>();
    
    // ============================================
    // SECURITY HELPER METHODS
    // ============================================
    
    /**
     * Sanitize user input to prevent SQL injection
     */
    private String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }
        // Remove potentially dangerous characters
        // Allow: letters, numbers, @, ., _, -
        String sanitized = input.trim().replaceAll("[^a-zA-Z0-9@._-]", "");
        
        // Limit length
        if (sanitized.length() > 100) {
            sanitized = sanitized.substring(0, 100);
        }
        
        return sanitized;
    }
    
    /**
     * Check rate limiting for OTP requests
     */
    private ResponseEntity<?> checkRateLimit(String userId, String userType) {
        String rateLimitKey = "rate:" + userId;
        Long lastRequest = lastOTPRequest.get(rateLimitKey);
        
        if (lastRequest != null) {
            long timeSinceLastRequest = System.currentTimeMillis() - lastRequest;
            if (timeSinceLastRequest < rateLimitSeconds * 1000) {
                long waitTime = (rateLimitSeconds * 1000 - timeSinceLastRequest) / 1000;
                logAuthEvent(userId, userType, "OTP_SENT", "RATE_LIMITED", "Wait " + waitTime + " seconds");
                return ResponseEntity.status(429)
                    .body(createErrorResponse("Please wait " + waitTime + " seconds before requesting another OTP"));
            }
        }
        
        // Update last request time
        lastOTPRequest.put(rateLimitKey, System.currentTimeMillis());
        return null;
    }
    
    /**
     * Verify OTP with attempt limiting
     */
    private ResponseEntity<?> verifyOTPWithAttempts(String email, String otp, String userId, String userType) {
        // Check if OTP exists
        if (!otpStore.containsKey(email)) {
            logAuthEvent(userId, userType, "LOGIN", "FAILED", "No OTP found");
            return ResponseEntity.status(400).body(createErrorResponse("No OTP found. Please request a new one"));
        }
        
        // Check OTP expiry
        long timestamp = otpTimestamp.get(email);
        if (System.currentTimeMillis() - timestamp > otpExpiryMinutes * 60 * 1000) {
            otpStore.remove(email);
            otpTimestamp.remove(email);
            otpAttempts.remove(email);
            logAuthEvent(userId, userType, "LOGIN", "FAILED", "OTP expired");
            return ResponseEntity.status(400).body(createErrorResponse("OTP expired. Please request a new one"));
        }
        
        // Check attempts
        int attempts = otpAttempts.getOrDefault(email, 0);
        if (attempts >= maxOTPAttempts) {
            otpStore.remove(email);
            otpTimestamp.remove(email);
            otpAttempts.remove(email);
            logAuthEvent(userId, userType, "LOGIN", "BLOCKED", "Max attempts reached");
            System.out.println("⚠️  Max attempts reached for: " + email);
            return ResponseEntity.status(429)
                .body(createErrorResponse("Too many failed attempts. Please request a new OTP"));
        }
        
        // Verify OTP using BCrypt
        String storedHashedOTP = otpStore.get(email);
        if (!passwordEncoder.matches(otp, storedHashedOTP)) {
            otpAttempts.put(email, attempts + 1);
            int remaining = maxOTPAttempts - attempts - 1;
            logAuthEvent(userId, userType, "LOGIN", "FAILED", "Invalid OTP (attempt " + (attempts + 1) + "/" + maxOTPAttempts + ")");
            System.out.println("❌ Invalid OTP attempt " + (attempts + 1) + "/" + maxOTPAttempts + " for: " + email);
            return ResponseEntity.status(400)
                .body(createErrorResponse("Invalid OTP. " + remaining + " attempt(s) remaining"));
        }
        
        // Success - clear all tracking data
        otpStore.remove(email);
        otpTimestamp.remove(email);
        otpAttempts.remove(email);
        logAuthEvent(userId, userType, "LOGIN", "SUCCESS", "OTP verified successfully");
        System.out.println("✅ OTP verified successfully for: " + email);
        
        return null; // null means success
    }
    
    /**
     * Log authentication events for security monitoring
     */
    private void logAuthEvent(String userId, String userType, String action, String status, String message) {
        String timestamp = LocalDateTime.now().toString();
        System.out.println(String.format(
            "[AUTH] %s | User: %s (%s) | Action: %s | Status: %s | Message: %s",
            timestamp, userId, userType, action, status, message
        ));
    }
    
    // Login with Security ID
    @PostMapping("/login/security-id")
    public ResponseEntity<?> loginWithSecurityId(@RequestBody Map<String, String> request) {
        try {
            String securityId = sanitizeInput(request.get("securityId"));

            if (securityId == null || securityId.isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("Security ID is required"));
            }

            // Check rate limiting
            ResponseEntity<?> rateLimitResponse = checkRateLimit(securityId, "SECURITY");
            if (rateLimitResponse != null) {
                return rateLimitResponse;
            }

            Optional<SecurityPersonnel> securityOpt = securityPersonnelRepository.findBySecurityIdIgnoreCase(securityId);

            if (securityOpt.isEmpty()) {
                logAuthEvent(securityId, "SECURITY", "OTP_SENT", "FAILED", "Security ID not found");
                return ResponseEntity.status(404).body(createErrorResponse("Security ID not found"));
            }

            SecurityPersonnel security = securityOpt.get();

            if (!security.getIsActive()) {
                logAuthEvent(securityId, "SECURITY", "OTP_SENT", "FAILED", "Account inactive");
                return ResponseEntity.status(403).body(createErrorResponse("Account is inactive"));
            }

            // Generate and store OTP with BCrypt hashing
            String otp = generateOTP();
            String hashedOTP = passwordEncoder.encode(otp);
            otpStore.put(security.getEmail(), hashedOTP);
            otpTimestamp.put(security.getEmail(), System.currentTimeMillis());
            
            // Send OTP via Email
            sendOTPEmail(security.getEmail(), otp, security.getName());
  // Log OTP to console for testing - ENHANCED FORMAT
            System.out.println("\n" + "=".repeat(70));
            System.out.println("🔐 OTP GENERATED - SECURITY ID LOGIN");
            System.out.println("=".repeat(70));
            System.out.println("│ Security ID : " + security.getSecurityId());
            System.out.println("│ Name        : " + security.getName());
            System.out.println("│ Email       : " + security.getEmail());
            System.out.println("│ Gate        : " + security.getGateAssignment());
            System.out.println("│ Shift       : " + security.getShift());
            System.out.println("├" + "─".repeat(68));
            System.out.println("│ ⚡ OTP CODE : " + otp);
            System.out.println("│ ⏰ Valid for: " + otpExpiryMinutes + " minutes");
            System.out.println("=".repeat(70) + "\n");
            
            logAuthEvent(securityId, "SECURITY", "OTP_SENT", "SUCCESS", "OTP sent to " + maskEmail(security.getEmail()));

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "OTP sent to registered email");
            response.put("email", maskEmail(security.getEmail()));
            response.put("securityId", security.getSecurityId());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Error in loginWithSecurityId: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(createErrorResponse("Login failed"));
        }
    }
    
    // Login with QR Code
    @PostMapping("/login/qr-code")
    public ResponseEntity<?> loginWithQRCode(@RequestBody Map<String, String> request) {
        try {
            String qrCode = request.get("qrCode");

            if (qrCode == null || qrCode.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("QR code is required"));
            }

            Optional<SecurityPersonnel> securityOpt = securityPersonnelRepository.findByQrCode(qrCode);

            if (securityOpt.isEmpty()) {
                return ResponseEntity.status(404).body(createErrorResponse("QR code not found"));
            }

            SecurityPersonnel security = securityOpt.get();

            if (!security.getIsActive()) {
                return ResponseEntity.status(403).body(createErrorResponse("Account is inactive"));
            }

            // Generate and store OTP
            String otp = generateOTP();
            otpStore.put(security.getEmail(), otp);
            otpTimestamp.put(security.getEmail(), System.currentTimeMillis());
            
            // Send OTP via Email
            sendOTPEmail(security.getEmail(), otp, security.getName());

            // Log OTP to console for testing - ENHANCED FORMAT
            System.out.println("\n" + "=".repeat(70));
            System.out.println("🔐 OTP GENERATED - QR CODE LOGIN");
            System.out.println("=".repeat(70));
            System.out.println("│ QR Code     : " + qrCode);
            System.out.println("│ Security ID : " + security.getSecurityId());
            System.out.println("│ Name        : " + security.getName());
            System.out.println("│ Email       : " + security.getEmail());
            System.out.println("│ Gate        : " + security.getGateAssignment());
            System.out.println("│ Shift       : " + security.getShift());
            System.out.println("├" + "─".repeat(68));
            System.out.println("│ ⚡ OTP CODE : " + otp);
            System.out.println("│ ⏰ Valid for: 5 minutes");
            System.out.println("=".repeat(70) + "\n");

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "OTP sent to registered email");
            response.put("email", maskEmail(security.getEmail()));
            response.put("securityId", security.getSecurityId());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Error in loginWithQRCode: " + e.getMessage());
            return ResponseEntity.internalServerError().body(createErrorResponse("Login failed"));
        }
    }
    
    // Verify OTP
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOTP(@RequestBody Map<String, String> request) {
        try {
            String securityId = sanitizeInput(request.get("securityId"));
            String otp = sanitizeInput(request.get("otp"));
            
            if (securityId == null || otp == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("Security ID and OTP are required"));
            }
            
            Optional<SecurityPersonnel> securityOpt = securityPersonnelRepository.findBySecurityIdIgnoreCase(securityId);
            
            if (securityOpt.isEmpty()) {
                logAuthEvent(securityId, "SECURITY", "LOGIN", "FAILED", "Security personnel not found");
                return ResponseEntity.status(404).body(createErrorResponse("Security personnel not found"));
            }
            
            SecurityPersonnel security = securityOpt.get();
            String email = security.getEmail();
            
            // Use unified verification with attempt limiting
            ResponseEntity<?> verificationError = verifyOTPWithAttempts(email, otp, securityId, "SECURITY");
            if (verificationError != null) {
                return verificationError;
            }
            
            // OTP verified successfully - use DTO
            UserResponseDTO userDTO = new UserResponseDTO(
                null,
                security.getSecurityId(),
                security.getName(),
                security.getEmail(),
                security.getPhone(),
                security.getGateAssignment(),
                security.getIsActive()
            );
            userDTO.setSecurityId(security.getSecurityId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("security", userDTO);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in verifyOTP: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(createErrorResponse("Verification failed"));
        }
    }
    
    // Helper methods
    private String generateOTP() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000); // 6-digit OTP
        return String.valueOf(otp);
    }
    
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        String[] parts = email.split("@");
        String username = parts[0];
        String domain = parts[1];
        
        if (username.length() <= 2) {
            return email;
        }
        
        String masked = username.substring(0, 2) + "***" + username.substring(username.length() - 1);
        return masked + "@" + domain;
    }
    
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }

    /**
     * Send OTP email — never throws. Email failure is logged but does NOT block login.
     * The OTP is always printed to console as a fallback.
     */
    private void sendOTPEmail(String email, String otp, String name) {
        try {
            emailService.sendOTP(email, otp, name);
            System.out.println("✅ OTP email dispatched to: " + email);
        } catch (Exception e) {
            System.err.println("⚠️  Email send failed for " + email + ": " + e.getMessage());
            System.err.println("⚠️  OTP is still valid — user can get it from Render logs.");
        }
    }
    
    // ============================================
    // STUDENT AUTHENTICATION
    // ============================================
    
    @PostMapping("/student/send-otp")
    public ResponseEntity<?> sendStudentOTP(@RequestBody Map<String, String> request) {
        try {
            String regNo = sanitizeInput(request.get("regNo"));
            
            if (regNo == null || regNo.isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("Registration number is required"));
            }
            
            // Check rate limiting
            ResponseEntity<?> rateLimitResponse = checkRateLimit(regNo, "STUDENT");
            if (rateLimitResponse != null) {
                return rateLimitResponse;
            }
            
            Optional<Student> studentOpt = studentRepository.findByRegNo(regNo);
            
            if (studentOpt.isEmpty()) {
                logAuthEvent(regNo, "STUDENT", "OTP_SENT", "FAILED", "Student not found");
                return ResponseEntity.status(404).body(createErrorResponse("Student not found"));
            }
            
            Student student = studentOpt.get();
            
            // Generate and store OTP with BCrypt hashing
            String otp = generateOTP();
            String hashedOTP = passwordEncoder.encode(otp);
            otpStore.put(student.getEmail(), hashedOTP);
            otpTimestamp.put(student.getEmail(), System.currentTimeMillis());
            
            // Send OTP via Email
            sendOTPEmail(student.getEmail(), otp, student.getFullName());
            
            // Log OTP to console
            System.out.println("\n" + "=".repeat(70));
            System.out.println("🔐 OTP GENERATED - STUDENT LOGIN");
            System.out.println("=".repeat(70));
            System.out.println("│ Reg No      : " + student.getRegNo());
            System.out.println("│ Name        : " + student.getFullName());
            System.out.println("│ Email       : " + student.getEmail());
            System.out.println("│ Department  : " + student.getDepartment());
            System.out.println("├" + "─".repeat(68));
            System.out.println("│ ⚡ OTP CODE : " + otp);
            System.out.println("│ ⏰ Valid for: " + otpExpiryMinutes + " minutes");
            System.out.println("=".repeat(70) + "\n");
            
            logAuthEvent(regNo, "STUDENT", "OTP_SENT", "SUCCESS", "OTP sent to " + maskEmail(student.getEmail()));
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "OTP sent to registered email");
            response.put("email", maskEmail(student.getEmail()));
            response.put("regNo", student.getRegNo());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in sendStudentOTP: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(createErrorResponse("Failed to send OTP"));
        }
    }
    
    @PostMapping("/student/verify-otp")
    public ResponseEntity<?> verifyStudentOTP(@RequestBody Map<String, String> request) {
        try {
            String regNo = sanitizeInput(request.get("regNo"));
            String otp = sanitizeInput(request.get("otp"));
            
            if (regNo == null || otp == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("Registration number and OTP are required"));
            }
            
            Optional<Student> studentOpt = studentRepository.findByRegNo(regNo);
            
            if (studentOpt.isEmpty()) {
                logAuthEvent(regNo, "STUDENT", "LOGIN", "FAILED", "Student not found");
                return ResponseEntity.status(404).body(createErrorResponse("Student not found"));
            }
            
            Student student = studentOpt.get();
            String email = student.getEmail();
            
            // Use unified verification with attempt limiting
            ResponseEntity<?> verificationError = verifyOTPWithAttempts(email, otp, regNo, "STUDENT");
            if (verificationError != null) {
                return verificationError;
            }
            
            // OTP verified successfully - use DTO with firstName and lastName
            UserResponseDTO userDTO = new UserResponseDTO(
                null,
                student.getRegNo(),
                student.getFirstName(),
                student.getLastName(),
                student.getEmail(),
                student.getPhone(),
                student.getDepartment(),
                student.getIsActive()
            );
            
            // Set regNo explicitly for frontend compatibility
            userDTO.setRegNo(student.getRegNo());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("student", userDTO);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in verifyStudentOTP: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(createErrorResponse("Verification failed"));
        }
    }
    
    // ============================================
    // STAFF AUTHENTICATION
    // ============================================
    
    @PostMapping("/staff/send-otp")
    public ResponseEntity<?> sendStaffOTP(@RequestBody Map<String, String> request) {
        try {
            String staffCode = sanitizeInput(request.get("staffCode"));
            
            if (staffCode == null || staffCode.isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("Staff code is required"));
            }
            
            ResponseEntity<?> rateLimitResponse = checkRateLimit(staffCode, "STAFF");
            if (rateLimitResponse != null) return rateLimitResponse;
            
            // Check teaching_staffs first, then non_teaching_staffs
            String staffName, email, department, role;
            Optional<Staff> staffOpt = staffRepository.findByStaffCode(staffCode);
            if (staffOpt.isPresent()) {
                Staff staff = staffOpt.get();
                staffName = staff.getStaffName(); email = staff.getEmail();
                department = staff.getDepartment(); role = staff.getRole();
            } else {
                Optional<HR> ntfOpt = hrRepository.findByHrCode(staffCode);
                if (ntfOpt.isEmpty()) {
                    logAuthEvent(staffCode, "STAFF", "OTP_SENT", "FAILED", "Staff not found");
                    return ResponseEntity.status(404).body(createErrorResponse("Staff not found"));
                }
                HR ntf = ntfOpt.get();
                staffName = ntf.getHrName(); email = ntf.getEmail();
                department = ntf.getDepartment(); role = ntf.getRole();
            }
            
            String otp = generateOTP();
            otpStore.put(email, passwordEncoder.encode(otp));
            otpTimestamp.put(email, System.currentTimeMillis());
            sendOTPEmail(email, otp, staffName);
            System.out.println("🔐 OTP [STAFF/NTF] " + staffCode + " → " + otp);
            
            logAuthEvent(staffCode, "STAFF", "OTP_SENT", "SUCCESS", "OTP sent to " + maskEmail(email));
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "OTP sent to registered email");
            response.put("email", maskEmail(email));
            response.put("staffCode", staffCode);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in sendStaffOTP: " + e.getMessage());
            return ResponseEntity.internalServerError().body(createErrorResponse("Failed to send OTP"));
        }
    }
    
    @PostMapping("/staff/verify-otp")
    public ResponseEntity<?> verifyStaffOTP(@RequestBody Map<String, String> request) {
        try {
            String staffCode = sanitizeInput(request.get("staffCode"));
            String otp = sanitizeInput(request.get("otp"));
            
            if (staffCode == null || otp == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("Staff code and OTP are required"));
            }
            
            // Check teaching_staffs first, then non_teaching_staffs
            String staffName, email, department, role;
            Optional<Staff> staffOpt = staffRepository.findByStaffCode(staffCode);
            if (staffOpt.isPresent()) {
                Staff staff = staffOpt.get();
                staffName = staff.getStaffName(); email = staff.getEmail();
                department = staff.getDepartment(); role = staff.getRole();
            } else {
                Optional<HR> ntfOpt = hrRepository.findByHrCode(staffCode);
                if (ntfOpt.isEmpty()) {
                    logAuthEvent(staffCode, "STAFF", "LOGIN", "FAILED", "Staff not found");
                    return ResponseEntity.status(404).body(createErrorResponse("Staff not found"));
                }
                HR ntf = ntfOpt.get();
                staffName = ntf.getHrName(); email = ntf.getEmail();
                department = ntf.getDepartment(); role = ntf.getRole();
            }
            
            ResponseEntity<?> verificationError = verifyOTPWithAttempts(email, otp, staffCode, "STAFF");
            if (verificationError != null) return verificationError;
            
            UserResponseDTO userDTO = new UserResponseDTO(null, staffCode, staffName, email, null, department, true);
            userDTO.setStaffName(staffName);
            userDTO.setStaffCode(staffCode);
            userDTO.setRole(role);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("staff", userDTO);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in verifyStaffOTP: " + e.getMessage());
            return ResponseEntity.internalServerError().body(createErrorResponse("Verification failed"));
        }
    }
    
    // ============================================
    // HOD AUTHENTICATION
    // ============================================
    
    @PostMapping("/hod/send-otp")
    public ResponseEntity<?> sendHODOTP(@RequestBody Map<String, String> request) {
        try {
            String hodCode = sanitizeInput(request.get("hodCode"));
            
            if (hodCode == null || hodCode.isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("HOD code is required"));
            }
            
            // Check rate limiting
            ResponseEntity<?> rateLimitResponse = checkRateLimit(hodCode, "HOD");
            if (rateLimitResponse != null) {
                return rateLimitResponse;
            }
            
            Optional<HOD> hodOpt = hodRepository.findByHodCode(hodCode);
            
            if (hodOpt.isEmpty()) {
                logAuthEvent(hodCode, "HOD", "OTP_SENT", "FAILED", "HOD not found");
                return ResponseEntity.status(404).body(createErrorResponse("HOD not found"));
            }
            
            HOD hod = hodOpt.get();

            // HOD is validated by presence in departments table — no extra check needed
            // Fetch email and phone from teaching_staffs since departments table has no email
            String hodEmail = hod.getEmail();
            String hodPhone = hod.getPhone();
            if (hodEmail == null || hodEmail.isBlank()) {
                Optional<Staff> staffInfo = staffRepository.findByStaffCode(hodCode);
                if (staffInfo.isPresent()) {
                    hodEmail = staffInfo.get().getEmail();
                    hodPhone = staffInfo.get().getPhone();
                    hod.setEmail(hodEmail);
                    hod.setPhone(hodPhone);
                }
            }
            if (hodEmail == null || hodEmail.isBlank()) {
                logAuthEvent(hodCode, "HOD", "OTP_SENT", "FAILED", "No email on file");
                return ResponseEntity.status(404).body(createErrorResponse("No email found for this HOD"));
            }
            
            // Generate and store OTP with BCrypt hashing
            String otp = generateOTP();
            String hashedOTP = passwordEncoder.encode(otp);
            otpStore.put(hod.getEmail(), hashedOTP);
            otpTimestamp.put(hod.getEmail(), System.currentTimeMillis());
            
            // Send OTP via Email
            sendOTPEmail(hod.getEmail(), otp, hod.getHodName());
            // Log OTP to console
            System.out.println("\n" + "=".repeat(70));
            System.out.println("🔐 OTP GENERATED - HOD LOGIN");
            System.out.println("=".repeat(70));
            System.out.println("│ HOD Code    : " + hod.getHodCode());
            System.out.println("│ Name        : " + hod.getHodName());
            System.out.println("│ Email       : " + hod.getEmail());
            System.out.println("│ Department  : " + hod.getDepartment());
            System.out.println("├" + "─".repeat(68));
            System.out.println("│ ⚡ OTP CODE : " + otp);
            System.out.println("│ ⏰ Valid for: " + otpExpiryMinutes + " minutes");
            System.out.println("=".repeat(70) + "\n");
            
            logAuthEvent(hodCode, "HOD", "OTP_SENT", "SUCCESS", "OTP sent to " + maskEmail(hod.getEmail()));
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "OTP sent to registered email");
            response.put("email", maskEmail(hod.getEmail()));
            response.put("hodCode", hod.getHodCode());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in sendHODOTP: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(createErrorResponse("Failed to send OTP"));
        }
    }
    
    @PostMapping("/hod/verify-otp")
    public ResponseEntity<?> verifyHODOTP(@RequestBody Map<String, String> request) {
        try {
            String hodCode = sanitizeInput(request.get("hodCode"));
            String otp = sanitizeInput(request.get("otp"));
            
            if (hodCode == null || otp == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("HOD code and OTP are required"));
            }
            
            Optional<HOD> hodOpt = hodRepository.findByHodCode(hodCode);
            
            if (hodOpt.isEmpty()) {
                logAuthEvent(hodCode, "HOD", "LOGIN", "FAILED", "HOD not found");
                return ResponseEntity.status(404).body(createErrorResponse("HOD not found"));
            }
            
            HOD hod = hodOpt.get();

            // Email is not in departments table — fetch from teaching_staffs
            String email = hod.getEmail();
            if (email == null || email.isBlank()) {
                Optional<Staff> staffInfo = staffRepository.findByStaffCode(hodCode);
                if (staffInfo.isPresent()) {
                    email = staffInfo.get().getEmail();
                    hod.setEmail(email);
                    hod.setPhone(staffInfo.get().getPhone());
                }
            }
            if (email == null || email.isBlank()) {
                logAuthEvent(hodCode, "HOD", "LOGIN", "FAILED", "No email on file");
                return ResponseEntity.status(404).body(createErrorResponse("No email found for this HOD"));
            }
            
            // Use unified verification with attempt limiting
            ResponseEntity<?> verificationError = verifyOTPWithAttempts(email, otp, hodCode, "HOD");
            if (verificationError != null) {
                return verificationError;
            }
            
            // OTP verified successfully - use DTO
            UserResponseDTO userDTO = new UserResponseDTO(
                null,
                hod.getHodCode(),
                hod.getHodName(),
                email,
                hod.getPhone(),
                hod.getDepartment(),
                hod.getIsActive()
            );
            
            userDTO.setHodName(hod.getHodName());
            userDTO.setHodCode(hod.getHodCode());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("hod", userDTO);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in verifyHODOTP: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(createErrorResponse("Verification failed"));
        }
    }
    
    // ============================================
    // HR AUTHENTICATION
    // ============================================
    
    @PostMapping("/hr/send-otp")
    public ResponseEntity<?> sendHROTP(@RequestBody Map<String, String> request) {
        try {
            String hrCode = sanitizeInput(request.get("hrCode"));
            
            if (hrCode == null || hrCode.isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("HR code is required"));
            }
            
            // Check rate limiting
            ResponseEntity<?> rateLimitResponse = checkRateLimit(hrCode, "HR");
            if (rateLimitResponse != null) {
                return rateLimitResponse;
            }
            
            Optional<HR> hrOpt = hrRepository.findByHrCode(hrCode);
            
            if (hrOpt.isEmpty()) {
                logAuthEvent(hrCode, "HR", "OTP_SENT", "FAILED", "HR not found");
                return ResponseEntity.status(404).body(createErrorResponse("HR not found"));
            }
            
            HR hr = hrOpt.get();
            
            // Generate and store OTP with BCrypt hashing
            String otp = generateOTP();
            String hashedOTP = passwordEncoder.encode(otp);
            otpStore.put(hr.getEmail(), hashedOTP);
            otpTimestamp.put(hr.getEmail(), System.currentTimeMillis());
            
            // Send OTP via Email
            sendOTPEmail(hr.getEmail(), otp, hr.getHrName());
            // Log OTP to console
            System.out.println("\n" + "=".repeat(70));
            System.out.println("🔐 OTP GENERATED - HR LOGIN");
            System.out.println("=".repeat(70));
            System.out.println("│ HR Code     : " + hr.getHrCode());
            System.out.println("│ Name        : " + hr.getHrName());
            System.out.println("│ Email       : " + hr.getEmail());
            System.out.println("│ Department  : " + hr.getDepartment());
            System.out.println("├" + "─".repeat(68));
            System.out.println("│ ⚡ OTP CODE : " + otp);
            System.out.println("│ ⏰ Valid for: " + otpExpiryMinutes + " minutes");
            System.out.println("=".repeat(70) + "\n");
            
            logAuthEvent(hrCode, "HR", "OTP_SENT", "SUCCESS", "OTP sent to " + maskEmail(hr.getEmail()));
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "OTP sent to registered email");
            response.put("email", maskEmail(hr.getEmail()));
            response.put("hrCode", hr.getHrCode());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in sendHROTP: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(createErrorResponse("Failed to send OTP"));
        }
    }
    
    @PostMapping("/hr/verify-otp")
    public ResponseEntity<?> verifyHROTP(@RequestBody Map<String, String> request) {
        try {
            String hrCode = sanitizeInput(request.get("hrCode"));
            String otp = sanitizeInput(request.get("otp"));
            
            if (hrCode == null || otp == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("HR code and OTP are required"));
            }
            
            Optional<HR> hrOpt = hrRepository.findByHrCode(hrCode);
            
            if (hrOpt.isEmpty()) {
                logAuthEvent(hrCode, "HR", "LOGIN", "FAILED", "HR not found");
                return ResponseEntity.status(404).body(createErrorResponse("HR not found"));
            }
            
            HR hr = hrOpt.get();
            String email = hr.getEmail();
            
            // Use unified verification with attempt limiting
            ResponseEntity<?> verificationError = verifyOTPWithAttempts(email, otp, hrCode, "HR");
            if (verificationError != null) {
                return verificationError;
            }
            
            // OTP verified successfully - use DTO
            UserResponseDTO userDTO = new UserResponseDTO(
                null,
                hr.getHrCode(),
                hr.getHrName(),
                hr.getEmail(),
                hr.getPhone(),
                hr.getDepartment(),
                hr.getIsActive()
            );
            
            // Set hrName explicitly for frontend compatibility
            userDTO.setHrName(hr.getHrName());
            userDTO.setHrCode(hr.getHrCode());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("hr", userDTO);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in verifyHROTP: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(createErrorResponse("Verification failed"));
        }
    }

    // ============================================
    // SECURITY PERSONNEL OTP ENDPOINTS
    // ============================================

    @PostMapping("/security/send-otp")
    public ResponseEntity<?> sendSecurityOTP(@RequestBody Map<String, String> request) {
        try {
            String securityCode = sanitizeInput(request.get("securityCode"));

            if (securityCode == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("Security code is required"));
            }

            // Check rate limiting
            ResponseEntity<?> rateLimitError = checkRateLimit(securityCode, "SECURITY");
            if (rateLimitError != null) {
                return rateLimitError;
            }

            Optional<SecurityPersonnel> securityOpt = securityPersonnelRepository.findBySecurityIdIgnoreCase(securityCode);

            if (securityOpt.isEmpty()) {
                logAuthEvent(securityCode, "SECURITY", "OTP_REQUEST", "FAILED", "Security personnel not found");
                return ResponseEntity.status(404).body(createErrorResponse("Security personnel not found"));
            }

            SecurityPersonnel security = securityOpt.get();
            String email = security.getEmail();

            if (email == null || email.trim().isEmpty()) {
                logAuthEvent(securityCode, "SECURITY", "OTP_REQUEST", "FAILED", "No email configured");
                return ResponseEntity.badRequest().body(createErrorResponse("No email configured for this security personnel"));
            }

            String otp = generateOTP();

            // Store OTP with 5 minute expiry
            otpStore.put(email, otp);
            otpExpiry.put(email, System.currentTimeMillis() + 300000);
            otpAttempts.put(email, 0);

            // Send OTP via email
            sendOTPEmail(email, otp, security.getName());

            logAuthEvent(securityCode, "SECURITY", "OTP_SENT", "SUCCESS", "OTP sent to " + maskEmail(email));

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "OTP sent to " + maskEmail(email));
            response.put("email", maskEmail(email));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Error in sendSecurityOTP: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(createErrorResponse("Failed to send OTP"));
        }
    }

    @PostMapping("/security/verify-otp")
    public ResponseEntity<?> verifySecurityOTP(@RequestBody Map<String, String> request) {
        try {
            String securityCode = sanitizeInput(request.get("securityCode"));
            String otp = sanitizeInput(request.get("otp"));

            if (securityCode == null || otp == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("Security code and OTP are required"));
            }

            Optional<SecurityPersonnel> securityOpt = securityPersonnelRepository.findBySecurityIdIgnoreCase(securityCode);

            if (securityOpt.isEmpty()) {
                logAuthEvent(securityCode, "SECURITY", "LOGIN", "FAILED", "Security personnel not found");
                return ResponseEntity.status(404).body(createErrorResponse("Security personnel not found"));
            }

            SecurityPersonnel security = securityOpt.get();
            String email = security.getEmail();

            // Use unified verification with attempt limiting
            ResponseEntity<?> verificationError = verifyOTPWithAttempts(email, otp, securityCode, "SECURITY");
            if (verificationError != null) {
                return verificationError;
            }

            // OTP verified successfully
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("security", security);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Error in verifySecurityOTP: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(createErrorResponse("Verification failed"));
        }
    }


    // ============================================
    // QR CODE LOGIN
    // ============================================
    
    @PostMapping("/qr-login")
    public ResponseEntity<?> qrLogin(@RequestBody Map<String, String> request) {
        try {
            String qrData = request.get("qrData");
            
            if (qrData == null || qrData.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("QR data is required"));
            }
            
            qrData = qrData.trim();
            
            System.out.println("\n" + "=".repeat(70));
            System.out.println("📱 QR LOGIN ATTEMPT");
            System.out.println("=".repeat(70));
            System.out.println("│ QR Data: " + qrData);
            System.out.println("=".repeat(70) + "\n");
            
            // Auto-detect role from user ID pattern
            String userId = qrData;
            String role = detectRoleFromUserId(userId);
            
            System.out.println("📋 Auto-detected - Role: " + role + ", UserID: " + userId);
            
            // Split is no longer needed - we use the whole QR data as userId
            String[] parts = new String[]{role, userId};
            // Role already detected above
            role = parts[0].toUpperCase().trim();
            userId = parts[1].trim();
            
            System.out.println("📋 Parsed QR - Role: " + role + ", UserID: " + userId);
            
            // Validate and fetch user based on role
            UserResponseDTO userDTO = null;
            String userKey = null;
            
            switch (role) {
                case "STUDENT": {
                    Optional<Student> studentOpt = studentRepository.findByRegNo(userId);
                    if (studentOpt.isEmpty()) {
                        logAuthEvent(userId, "STUDENT", "QR_LOGIN", "FAILED", "Student not found");
                        return ResponseEntity.status(404).body(createErrorResponse("Student not found"));
                    }
                    Student student = studentOpt.get();
                    if (!student.getIsActive()) {
                        logAuthEvent(userId, "STUDENT", "QR_LOGIN", "FAILED", "Account inactive");
                        return ResponseEntity.status(403).body(createErrorResponse("Account is inactive"));
                    }
                    userDTO = new UserResponseDTO(
                        null,
                        student.getRegNo(),
                        student.getFirstName(),
                        student.getLastName(),
                        student.getEmail(),
                        student.getPhone(),
                        student.getDepartment(),
                        student.getIsActive()
                    );
                    userDTO.setRegNo(student.getRegNo());
                    userKey = "student";
                    break;
                }
                case "STAFF": {
                    Optional<Staff> staffOpt = staffRepository.findByStaffCode(userId);
                    if (staffOpt.isEmpty()) {
                        logAuthEvent(userId, "STAFF", "QR_LOGIN", "FAILED", "Staff not found");
                        return ResponseEntity.status(404).body(createErrorResponse("Staff not found"));
                    }
                    Staff staff = staffOpt.get();
                    if (!staff.getIsActive()) {
                        logAuthEvent(userId, "STAFF", "QR_LOGIN", "FAILED", "Account inactive");
                        return ResponseEntity.status(403).body(createErrorResponse("Account is inactive"));
                    }
                    userDTO = new UserResponseDTO(
                        null,
                        staff.getStaffCode(),
                        staff.getStaffName(),
                        staff.getEmail(),
                        staff.getPhone(),
                        staff.getDepartment(),
                        staff.getIsActive()
                    );

                    // --- Role Refinement for QR Login ---
                    String staffRole = staff.getRole() != null ? staff.getRole().toUpperCase() : "";
                    String staffDept = staff.getDepartment() != null ? staff.getDepartment().trim() : "";
                    String staffName = staff.getStaffName() != null ? staff.getStaffName().trim() : "";

                    if (staffRole.contains("HR") || DepartmentMapper.isAdminDepartment(staffDept) || staffRole.contains("ADMIN")) {
                        role = "HR";
                        userKey = "hr";
                        userDTO.setHrName(staff.getStaffName());
                        userDTO.setHrCode(staff.getStaffCode());
                    } else if (staffRole.contains("HOD") || (!staffName.isEmpty() && isHodByNameMatch(staffName))) {
                        role = "HOD";
                        userKey = "hod";
                        userDTO.setHodName(staff.getStaffName());
                    } else {
                        userDTO.setStaffName(staff.getStaffName());
                        userDTO.setStaffCode(staff.getStaffCode());
                        userKey = "staff";
                    }
                    break;
                }
                case "HOD": {
                    Optional<HOD> hodOpt = hodRepository.findByHodCode(userId);
                    if (hodOpt.isEmpty()) {
                        logAuthEvent(userId, "HOD", "QR_LOGIN", "FAILED", "HOD not found");
                        return ResponseEntity.status(404).body(createErrorResponse("HOD not found"));
                    }
                    HOD hod = hodOpt.get();
                    if (!hod.getIsActive()) {
                        logAuthEvent(userId, "HOD", "QR_LOGIN", "FAILED", "Account inactive");
                        return ResponseEntity.status(403).body(createErrorResponse("Account is inactive"));
                    }
                    userDTO = new UserResponseDTO(
                        null,
                        hod.getHodCode(),
                        hod.getHodName(),
                        hod.getEmail(),
                        hod.getPhone(),
                        hod.getDepartment(),
                        hod.getIsActive()
                    );
                    userDTO.setHodName(hod.getHodName());
                    userKey = "hod";
                    break;
                }
                case "HR": {
                    Optional<HR> hrOpt = hrRepository.findByHrCode(userId);
                    if (hrOpt.isEmpty()) {
                        logAuthEvent(userId, "HR", "QR_LOGIN", "FAILED", "HR not found");
                        return ResponseEntity.status(404).body(createErrorResponse("HR not found"));
                    }
                    HR hr = hrOpt.get();
                    if (!hr.getIsActive()) {
                        logAuthEvent(userId, "HR", "QR_LOGIN", "FAILED", "Account inactive");
                        return ResponseEntity.status(403).body(createErrorResponse("Account is inactive"));
                    }
                    userDTO = new UserResponseDTO(
                        null,
                        hr.getHrCode(),
                        hr.getHrName(),
                        hr.getEmail(),
                        hr.getPhone(),
                        hr.getDepartment(),
                        hr.getIsActive()
                    );
                    userDTO.setHrName(hr.getHrName());
                    userKey = "hr";
                    break;
                }
                case "SECURITY": {
                    Optional<SecurityPersonnel> securityOpt = securityPersonnelRepository.findBySecurityIdIgnoreCase(userId);
                    if (securityOpt.isEmpty()) {
                        logAuthEvent(userId, "SECURITY", "QR_LOGIN", "FAILED", "Security not found");
                        return ResponseEntity.status(404).body(createErrorResponse("Security personnel not found"));
                    }
                    SecurityPersonnel security = securityOpt.get();
                    if (!security.getIsActive()) {
                        logAuthEvent(userId, "SECURITY", "QR_LOGIN", "FAILED", "Account inactive");
                        return ResponseEntity.status(403).body(createErrorResponse("Account is inactive"));
                    }
                    userDTO = new UserResponseDTO(
                        null,
                        security.getSecurityId(),
                        security.getName(),
                        security.getEmail(),
                        security.getPhone(),
                        security.getGateAssignment(),
                        security.getIsActive()
                    );
                    userKey = "security";
                    break;
                }
                default:
                    logAuthEvent(userId, role, "QR_LOGIN", "FAILED", "Invalid role");
                    return ResponseEntity.badRequest().body(createErrorResponse("Invalid user role in QR code"));
            }
            
            logAuthEvent(userId, role, "QR_LOGIN", "SUCCESS", "Login successful");
            
            System.out.println("✅ QR Login successful for " + role + ": " + userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "QR login successful");
            response.put("role", role);
            response.put(userKey, userDTO);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in qrLogin: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(createErrorResponse("QR login failed"));
        }
    }

    /**
     * Auto-detect user role from ID pattern
     */
    private String detectRoleFromUserId(String userId) {
        if (userId == null || userId.isEmpty()) {
            return "UNKNOWN";
        }
        
        String upperUserId = userId.toUpperCase();
        
        // Check for HOD (contains "HOD")
        if (upperUserId.contains("HOD")) {
            return "HOD";
        }
        
        // Check for HR (starts with HR followed by numbers)
        if (upperUserId.matches("^HR\\d+$")) {
            return "HR";
        }
        
        // Check for Security (starts with SEC followed by numbers)
        if (upperUserId.matches("^SEC\\d+$")) {
            return "SECURITY";
        }
        
        // Check for Staff (2-3 letters followed by numbers, e.g., AD121, CS101, ADSTAFF001)
        if (upperUserId.matches("^[A-Z]{2,}(STAFF)?\\d+$") && !upperUserId.matches("^\\d+$")) {
            return "STAFF";
        }
        
        // Check for Student (only numbers, e.g., 2117240030009)
        if (upperUserId.matches("^\\d+$")) {
            return "STUDENT";
        }
        
        // Default to STUDENT if no pattern matches
        return "STUDENT";
    }

    // Health check endpoint for frontend connectivity testing
    @GetMapping("/me")
    public ResponseEntity<?> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Backend is running");
        response.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.ok(response);
    }

    /**
     * Normalize a name for HOD comparison:
     *  - Strip honorary titles (Dr., Prof., Mr., Mrs., Ms.)
     *  - Remove trailing dots and periods
     *  - Remove all non-alphanumeric characters except spaces
     *  - Collapse multiple spaces
     *  - Uppercase
     */
    private String normalizeNameForComparison(String name) {
        if (name == null || name.isBlank()) return "";
        String n = name.trim();
        // Remove titles
        n = n.replaceAll("(?i)^(dr\\.?|prof\\.?|mr\\.?|mrs\\.?|ms\\.?)\\s*", "").trim();
        // Remove trailing dots
        n = n.replaceAll("\\.+$", "").trim();
        // Remove all non-alphanumeric except spaces
        n = n.replaceAll("[^a-zA-Z0-9\\s]", " ").trim();
        // Collapse multiple spaces
        n = n.replaceAll("\\s+", " ").trim();
        return n.toUpperCase();
    }

    /**
     * Extract the HOD name from a students.hod entry like "UMA S./ASSO P".
     * Takes only the part before "/" and normalizes it.
     */
    private String extractHodNameFromEntry(String hodEntry) {
        if (hodEntry == null || hodEntry.isBlank()) return "";
        // Take part before "/"
        String namePart = hodEntry.contains("/") ? hodEntry.split("/")[0].trim() : hodEntry.trim();
        return normalizeNameForComparison(namePart);
    }

    /**
     * Check whether a staff name matches any HOD name from the students table.
     * Uses a multi-strategy approach:
     *   1. Exact normalized match
     *   2. One name contains the other (handles partial name formats)
     *   3. Token intersection: if ≥50% of the shorter name's tokens (≥2 chars) match
     */
    private boolean isHodByNameMatch(String rawStaffName) {
        // HOD is now determined by departments table, not students.hod column
        // This method is kept for backward compat but uses hodRepository
        if (rawStaffName == null || rawStaffName.isBlank()) return false;
        String norm = normalizeNameForComparison(rawStaffName);
        return hodRepository.findAll().stream().anyMatch(hod -> {
            if (hod.getHodName() == null) return false;
            String hodNorm = normalizeNameForComparison(hod.getHodName());
            return norm.equals(hodNorm) || norm.contains(hodNorm) || hodNorm.contains(norm);
        });
    }

    /**
     * Detect the actual role of a staff code.
     * Priority:
     *   1. HR / HOD explicit role field
     *   2. Non-Teaching dept → NON_TEACHING
     *   3. Principal / Director role → NON_CLASS_INCHARGE (direct-to-HR)
     *   4. Check class_incharge table by staff_code AND by name fuzzy match
     *      → found = STAFF (class incharge)
     *      → not found = NON_CLASS_INCHARGE (direct-to-HR)
     *   5. HOD name match fallback
     */
    @GetMapping("/detect-role/{staffCode}")
    public ResponseEntity<?> detectStaffRole(@PathVariable String staffCode) {
        try {
            String code = sanitizeInput(staffCode);
            if (code == null || code.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Staff code required"));
            }

            // 1. Student?
            if (studentRepository.findByRegNo(code).isPresent()) {
                return ResponseEntity.ok(Map.of("success", true, "role", "STUDENT"));
            }

            // 2. HOD? — check departments table (staff_code column)
            if (hodRepository.isHOD(code)) {
                return ResponseEntity.ok(Map.of("success", true, "role", "HOD"));
            }

            // 3. HR or AO? — check non_teaching_staffs by designation
            Optional<HR> hrOpt = hrRepository.findByHrCode(code);
            if (hrOpt.isPresent()) {
                String designation = hrOpt.get().getRole() != null ? hrOpt.get().getRole() : "";
                if (designation.equalsIgnoreCase("Senior Manager - HR")) {
                    return ResponseEntity.ok(Map.of("success", true, "role", "HR"));
                }
                if (designation.equalsIgnoreCase("Administrative Officer")) {
                    return ResponseEntity.ok(Map.of("success", true, "role", "ADMIN_OFFICER"));
                }
                // Other non-teaching staff → NON_TEACHING
                return ResponseEntity.ok(Map.of("success", true, "role", "NON_TEACHING"));
            }

            // 4. Teaching staff? — check teaching_staffs table
            Optional<Staff> staffOpt = staffRepository.findByStaffCode(code);
            if (staffOpt.isPresent()) {
                // Is this staff code a class incharge? (appears in students.staff_code)
                boolean isClassIncharge = staffRepository.isClassIncharge(code);
                if (isClassIncharge) {
                    return ResponseEntity.ok(Map.of("success", true, "role", "STAFF"));
                }
                // Not a class incharge → NCI
                return ResponseEntity.ok(Map.of("success", true, "role", "NON_CLASS_INCHARGE"));
            }

            return ResponseEntity.ok(Map.of("success", false, "role", "UNKNOWN", "message", "User not found"));

        } catch (Exception e) {
            log.error("Error detecting role for {}: {}", staffCode, e.getMessage());
            return ResponseEntity.ok(Map.of("success", true, "role", "STAFF"));
        }
    }
}

