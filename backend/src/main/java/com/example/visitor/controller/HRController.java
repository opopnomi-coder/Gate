package com.example.visitor.controller;

import com.example.visitor.entity.GatePassRequest;
import com.example.visitor.entity.Visitor;
import com.example.visitor.service.GatePassRequestService;
import com.example.visitor.service.HODBulkGatePassService;
import com.example.visitor.service.VisitorRequestService;
import com.example.visitor.repository.VisitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/hr")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequiredArgsConstructor
@Slf4j
public class HRController {
    
    private final GatePassRequestService gatePassRequestService;
    private final HODBulkGatePassService hodBulkGatePassService;
    private final com.example.visitor.repository.HRRepository hrRepository;
    private final VisitorRepository visitorRepository;
    private final VisitorRequestService visitorRequestService;
    private final com.example.visitor.repository.RailwayExitLogRepository railwayExitLogRepository;
    private final com.example.visitor.repository.StudentRepository studentRepository;
    private final com.example.visitor.repository.StaffRepository staffRepository;
    private final com.example.visitor.repository.HODRepository hodRepository;
    private final com.example.visitor.repository.QRTableRepository qrTableRepository;
    private final com.example.visitor.repository.GatePassRequestRepository gatePassRequestRepository;
    private final com.example.visitor.repository.RailwayEntryRepository railwayEntryRepository;
    
    // ==================== HR APPROVAL ENDPOINTS ====================
    
    // Get requests pending HR approval
    @GetMapping("/gate-pass/pending")
    public ResponseEntity<?> getPendingRequests(@RequestParam String hrCode) {
        try {
            List<GatePassRequest> requests = gatePassRequestService.getRequestsForHRApproval(hrCode);
            
            log.info("Fetched {} pending requests for HR {}", requests.size(), hrCode);
            
            return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "requests", requests,
                "count", requests.size()
            ));
            
        } catch (Exception e) {
            log.error("Error fetching pending requests for HR", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "ERROR",
                "message", "Failed to fetch pending requests: " + e.getMessage()
            ));
        }
    }
    
    // Get all requests for HR
    @GetMapping("/gate-pass/all")
    public ResponseEntity<?> getAllRequests(@RequestParam String hrCode) {
        try {
            List<GatePassRequest> requests = gatePassRequestService.getAllRequestsForHR(hrCode);
            
            log.info("Fetched {} total requests for HR {}", requests.size(), hrCode);
            
            return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "requests", requests,
                "count", requests.size()
            ));
            
        } catch (Exception e) {
            log.error("Error fetching all requests for HR", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "ERROR",
                "message", "Failed to fetch requests: " + e.getMessage()
            ));
        }
    }
    
    // Approve request as HR
    @PostMapping("/gate-pass/{id}/approve")
    public ResponseEntity<?> approveRequest(@PathVariable Long id, @RequestBody Map<String, String> data) {
        try {
            String hrCode = data.get("hrCode");
            String remark = data.get("remark");
            
            if (hrCode == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "message", "HR code is required"
                ));
            }
            
            GatePassRequest request = gatePassRequestService.approveByHR(id, hrCode, remark);
            
            log.info("✅ Request {} approved by HR {}", id, hrCode);
            
            return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Request approved successfully",
                "request", request
            ));
            
        } catch (Exception e) {
            log.error("Error approving request", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "ERROR",
                "message", "Failed to approve request: " + e.getMessage()
            ));
        }
    }
    
    // Reject request as HR
    @PostMapping("/gate-pass/{id}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable Long id, @RequestBody Map<String, String> data) {
        try {
            String hrCode = data.get("hrCode");
            String reason = data.get("reason");
            
            if (hrCode == null || reason == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "message", "HR code and reason are required"
                ));
            }
            
            GatePassRequest request = gatePassRequestService.rejectByHR(id, hrCode, reason);
            
            log.info("✅ Request {} rejected by HR {}", id, hrCode);
            
            return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Request rejected successfully",
                "request", request
            ));
            
        } catch (Exception e) {
            log.error("Error rejecting request", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "ERROR",
                "message", "Failed to reject request: " + e.getMessage()
            ));
        }
    }
    
    // Get pending count
    @GetMapping("/gate-pass/pending-count")
    public ResponseEntity<?> getPendingCount(@RequestParam String hrCode) {
        try {
            long count = gatePassRequestService.getPendingRequestsCountForHR(hrCode);
            
            return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "count", count
            ));
            
        } catch (Exception e) {
            log.error("Error fetching pending count", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "ERROR",
                "message", "Failed to fetch pending count: " + e.getMessage()
            ));
        }
    }
    
    // ==================== HOD BULK PASS APPROVAL ENDPOINTS ====================
    
    // Get all pending HOD bulk pass requests (unified Gatepass table)
    @GetMapping("/bulk-pass/pending")
    public ResponseEntity<?> getPendingBulkPasses() {
        try {
            List<GatePassRequest> requests = hodBulkGatePassService.getPendingForHRApproval();
            
            List<Map<String, Object>> requestList = requests.stream().map(req -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", req.getId());
                map.put("hodCode", req.getRegNo());
                map.put("purpose", req.getPurpose());
                map.put("reason", req.getReason());
                map.put("exitDateTime", req.getExitDateTime());
                map.put("returnDateTime", req.getReturnDateTime());
                map.put("participantCount", req.getStudentCount() != null ? req.getStudentCount() : 0);
                map.put("includeHOD", req.getIncludeStaff()); // Using includeStaff field
                map.put("status", req.getStatus());
                map.put("hrApproval", req.getHrApproval());
                map.put("createdAt", req.getCreatedAt());
                return map;
            }).collect(Collectors.toList());
            
            log.info("Fetched {} pending HOD bulk pass requests for HR", requestList.size());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "requests", requestList,
                "count", requestList.size()
            ));
            
        } catch (Exception e) {
            log.error("Error fetching pending HOD bulk passes", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch pending bulk passes: " + e.getMessage()
            ));
        }
    }
    
    // Get specific HOD bulk pass request details (unified Gatepass table)
    @GetMapping("/bulk-pass/{requestId}")
    public ResponseEntity<?> getBulkPassDetails(@PathVariable Long requestId) {
        try {
            Map<String, Object> response = hodBulkGatePassService.getBulkGatePassDetails(requestId);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error fetching HOD bulk pass details", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch request details: " + e.getMessage()
            ));
        }
    }
    
    // Approve HOD bulk pass request (unified Gatepass table)
    @PostMapping("/bulk-pass/{requestId}/approve")
    public ResponseEntity<?> approveBulkPass(
            @PathVariable Long requestId,
            @RequestBody Map<String, String> requestData) {
        try {
            String hrCode = requestData.get("hrCode");
            if (hrCode == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "HR code is required"
                ));
            }
            
            // Use standard GatePassRequestService for approval (unified approach)
            GatePassRequest request = gatePassRequestService.approveByHR(requestId, hrCode);
            
            log.info("✅ HOD bulk pass approved: ID={}, HR={}, QR generated", 
                requestId, hrCode);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Bulk pass request approved successfully",
                "requestId", request.getId(),
                "status", request.getStatus(),
                "qrCode", request.getQrCode()
            ));
            
        } catch (Exception e) {
            log.error("Error approving HOD bulk pass", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to approve request: " + e.getMessage()
            ));
        }
    }
    
    // Reject HOD bulk pass request (unified Gatepass table)
    @PostMapping("/bulk-pass/{requestId}/reject")
    public ResponseEntity<?> rejectBulkPass(
            @PathVariable Long requestId,
            @RequestBody Map<String, String> requestData) {
        try {
            String hrCode = requestData.get("hrCode");
            String reason = requestData.get("reason");
            
            if (hrCode == null || reason == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "HR code and rejection reason are required"
                ));
            }
            
            // Use standard GatePassRequestService for rejection (unified approach)
            GatePassRequest request = gatePassRequestService.rejectByHR(requestId, hrCode, reason);
            
            log.info("❌ HOD bulk pass rejected: ID={}, HR={}, reason={}", 
                requestId, hrCode, reason);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Bulk pass request rejected",
                "requestId", request.getId(),
                "status", request.getStatus()
            ));
            
        } catch (Exception e) {
            log.error("Error rejecting HOD bulk pass", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to reject request: " + e.getMessage()
            ));
        }
    }
    
    // Get count of pending HOD bulk passes (unified Gatepass table)
    @GetMapping("/bulk-pass/pending/count")
    public ResponseEntity<?> getPendingBulkPassCount() {
        try {
            List<GatePassRequest> requests = hodBulkGatePassService.getPendingForHRApproval();
            long count = requests.size();
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "count", count
            ));
            
        } catch (Exception e) {
            log.error("Error fetching pending bulk pass count", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch count: " + e.getMessage()
            ));
        }
    }

    // Get visitor requests for HR (where staffCode = hrCode)
    @GetMapping("/visitor-requests")
    public ResponseEntity<?> getVisitorRequestsForHR(@RequestParam String hrCode) {
        try {
            List<Visitor> visitors = visitorRepository.findByStaffCode(hrCode);
            List<Map<String, Object>> result = visitors.stream().map(v -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", v.getId());
                map.put("passType", "VISITOR");
                map.put("requestType", "VISITOR");
                map.put("sourceType", "VISITOR");
                map.put("visitorName", v.getName());
                map.put("studentName", v.getName());
                map.put("visitorPhone", v.getPhone());
                map.put("visitorEmail", v.getEmail());
                map.put("department", v.getDepartment());
                map.put("role", v.getRole() != null ? v.getRole() : "VISITOR");
                map.put("purpose", v.getPurpose());
                map.put("numberOfPeople", v.getNumberOfPeople());
                map.put("vehicleNumber", v.getVehicleNumber());
                map.put("status", v.getStatus());
                map.put("hrApproval", v.getStatus()); // map status → hrApproval for tab filtering
                map.put("requestDate", v.getCreatedAt());
                map.put("staffCode", v.getStaffCode());
                return map;
            }).collect(Collectors.toList());
            log.info("Fetched {} visitor requests for HR {}", result.size(), hrCode);
            return ResponseEntity.ok(Map.of("success", true, "requests", result));
        } catch (Exception e) {
            log.error("Error fetching visitor requests for HR", e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // Approve visitor request as HR
    @PostMapping("/visitor-requests/{id}/approve")
    public ResponseEntity<?> approveVisitorRequest(@PathVariable Long id, @RequestBody Map<String, String> data) {
        try {
            String hrCode = data.get("hrCode");
            visitorRequestService.approveVisitorRequest(id, hrCode);
            return ResponseEntity.ok(Map.of("success", true, "message", "Visitor request approved"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // Reject visitor request as HR
    @PostMapping("/visitor-requests/{id}/reject")
    public ResponseEntity<?> rejectVisitorRequest(@PathVariable Long id, @RequestBody Map<String, String> data) {
        try {
            String reason = data.get("reason");
            visitorRequestService.rejectVisitorRequest(id, reason != null ? reason : "Rejected by HR");
            return ResponseEntity.ok(Map.of("success", true, "message", "Visitor request rejected"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // Get HR profile by HR code
    @GetMapping("/{hrCode}")
    public ResponseEntity<?> getHRProfile(@PathVariable String hrCode) {
        try {
            log.info("📋 Fetching HR profile for: {}", hrCode);

            // Find HR by code
            com.example.visitor.entity.HR hr = hrRepository.findByHrCode(hrCode)
                .orElseThrow(() -> new RuntimeException("HR not found"));

            Map<String, Object> hrDTO = new HashMap<>();
            hrDTO.put("id", hr.getId());
            hrDTO.put("hrCode", hr.getHrCode());
            hrDTO.put("hrId", hr.getHrCode());
            hrDTO.put("name", hr.getHrName());
            hrDTO.put("hrName", hr.getHrName());
            hrDTO.put("email", hr.getEmail());
            hrDTO.put("phone", hr.getPhone());
            hrDTO.put("department", hr.getDepartment());
            hrDTO.put("isActive", hr.getIsActive());

            log.info("✅ Found HR: {}", hr.getHrName());
            return ResponseEntity.ok(hrDTO);

        } catch (Exception e) {
            log.error("❌ Error fetching HR profile: {}", e.getMessage());
            e.printStackTrace();
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/exits")
    public ResponseEntity<?> getExits(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        try {
            LocalDate from = (fromDate == null || fromDate.isBlank()) ? LocalDate.now() : LocalDate.parse(fromDate);
            LocalDate to = (toDate == null || toDate.isBlank()) ? from : LocalDate.parse(toDate);
            LocalDateTime fromTs = from.atStartOfDay();
            LocalDateTime toTs = to.plusDays(1).atStartOfDay().minusNanos(1);

            List<com.example.visitor.entity.RailwayExitLog> exits =
                railwayExitLogRepository.findByExitTimeBetweenOrderByExitTimeDesc(fromTs, toTs)
                    .stream()
                    .filter(e -> {
                        String t = e.getUserType();
                        return "STUDENT".equalsIgnoreCase(t) || "STAFF".equalsIgnoreCase(t) || "HOD".equalsIgnoreCase(t);
                    })
                    .collect(Collectors.toList());

            List<Map<String, Object>> result = exits.stream().map(e -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", e.getId());
                map.put("userType", e.getUserType());
                map.put("userId", e.getUserId());

                // Resolve name from student/staff/HOD tables if personName is missing
                String resolvedName = e.getPersonName();
                if (resolvedName == null || resolvedName.isBlank() || resolvedName.startsWith("Visitor-")) {
                    String uid = e.getUserId();
                    String utype = e.getUserType() != null ? e.getUserType().toUpperCase() : "";
                    if (uid != null && !uid.isBlank()) {
                        try {
                            if ("STUDENT".equals(utype)) {
                                resolvedName = studentRepository.findByRegNo(uid)
                                    .map(s -> s.getFullName()).orElse(uid);
                            } else if ("STAFF".equals(utype) || "HOD".equals(utype)) {
                                resolvedName = staffRepository.findByStaffCode(uid)
                                    .map(s -> s.getStaffName()).orElse(null);
                                if (resolvedName == null) {
                                    resolvedName = hodRepository.findByHodCode(uid)
                                        .map(h -> h.getHodName()).orElse(uid);
                                }
                            }
                        } catch (Exception ex) {
                            resolvedName = uid;
                        }
                    }
                }

                map.put("name", resolvedName != null ? resolvedName : e.getUserId());

                // Resolve department — prefer stored value, fallback to user table
                String dept = e.getDepartment();
                if (dept == null || dept.isBlank()) {
                    String uid = e.getUserId();
                    String utype = e.getUserType() != null ? e.getUserType().toUpperCase() : "";
                    if (uid != null && !uid.isBlank()) {
                        try {
                            if ("STUDENT".equals(utype)) {
                                dept = studentRepository.findByRegNo(uid).map(s -> s.getDepartment()).orElse(null);
                            } else if ("STAFF".equals(utype)) {
                                dept = staffRepository.findByStaffCode(uid).map(s -> s.getDepartment()).orElse(null);
                            } else if ("HOD".equals(utype)) {
                                dept = hodRepository.findByHodCode(uid).map(h -> h.getDepartment()).orElse(null);
                            }
                        } catch (Exception ex) { /* ignore */ }
                    }
                }

                // Resolve purpose — prefer stored value, fallback to gate pass request
                String purpose = e.getPurpose();
                if ((purpose == null || purpose.isBlank()) && e.getQrId() != null) {
                    try {
                        com.example.visitor.entity.QRTable qr = qrTableRepository.findById(e.getQrId()).orElse(null);
                        if (qr != null && qr.getPassRequestId() != null) {
                            var gprOpt = gatePassRequestRepository.findById(qr.getPassRequestId());
                            if (gprOpt.isPresent()) {
                                var gpr = gprOpt.get();
                                purpose = gpr.getPurpose() != null ? gpr.getPurpose() : gpr.getReason();
                            }
                        }
                    } catch (Exception ex) { /* ignore */ }
                }

                map.put("department", dept != null ? dept : "-");
                map.put("purpose", purpose != null ? purpose : "-");
                map.put("exitTime", e.getExitTime());
                map.put("location", e.getLocation() != null ? e.getLocation() : e.getScanLocation());
                map.put("verifiedBy", e.getVerifiedBy());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "fromDate", from.toString(),
                "toDate", to.toString(),
                "count", result.size(),
                "exits", result
            ));
        } catch (Exception e) {
            log.error("Error fetching exit logs for HR", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch exits: " + e.getMessage()
            ));
        }
    }


    // ==================== COMBINED GATE LOGS (ENTRY + EXIT) ====================

    /**
     * Gate logs for HR / Principal — students and staff only, both entries and exits.
     */
    @GetMapping("/gate-logs")
    public ResponseEntity<?> getGateLogs(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        try {
            LocalDate from = (fromDate == null || fromDate.isBlank()) ? LocalDate.now() : LocalDate.parse(fromDate);
            LocalDate to = (toDate == null || toDate.isBlank()) ? from : LocalDate.parse(toDate);
            LocalDateTime fromTs = from.atStartOfDay();
            LocalDateTime toTs = to.plusDays(1).atStartOfDay().minusNanos(1);

            java.util.Set<String> allowedTypes = java.util.Set.of("STUDENT", "STAFF", "HOD");

            // ---- EXIT records from Exit_logs table ----
            List<Map<String, Object>> exitRecords = railwayExitLogRepository
                .findByExitTimeBetweenOrderByExitTimeDesc(fromTs, toTs)
                .stream()
                .filter(e -> {
                    String t = e.getUserType();
                    return t != null && allowedTypes.contains(t.toUpperCase());
                })
                .map(e -> buildExitMap(e, "EXIT"))
                .collect(Collectors.toList());

            // ---- ENTRY records from Entry table ----
            List<Map<String, Object>> entryRecords = railwayEntryRepository
                .findByTimestampBetweenOrderByTimestampDesc(fromTs, toTs)
                .stream()
                .filter(e -> {
                    String t = e.getUserType();
                    return t != null && allowedTypes.contains(t.toUpperCase());
                })
                .map(e -> buildEntryMap(e, "ENTRY"))
                .collect(Collectors.toList());

            // ---- Merge and sort by time descending ----
            List<Map<String, Object>> combined = new java.util.ArrayList<>();
            combined.addAll(exitRecords);
            combined.addAll(entryRecords);
            combined.sort((a, b) -> {
                LocalDateTime ta = (LocalDateTime) a.get("time");
                LocalDateTime tb = (LocalDateTime) b.get("time");
                if (ta == null && tb == null) return 0;
                if (ta == null) return 1;
                if (tb == null) return -1;
                return tb.compareTo(ta);
            });

            return ResponseEntity.ok(Map.of(
                "success", true,
                "fromDate", from.toString(),
                "toDate", to.toString(),
                "count", combined.size(),
                "logs", combined
            ));
        } catch (Exception e) {
            log.error("Error fetching gate logs", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch gate logs: " + e.getMessage()
            ));
        }
    }

    /**
     * Gate logs for Admin Officer — ALL user types (students, staff, visitors), both entries and exits.
     */
    @GetMapping("/admin/gate-logs")
    public ResponseEntity<?> getAdminGateLogs(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        try {
            LocalDate from = (fromDate == null || fromDate.isBlank()) ? LocalDate.now() : LocalDate.parse(fromDate);
            LocalDate to = (toDate == null || toDate.isBlank()) ? from : LocalDate.parse(toDate);
            LocalDateTime fromTs = from.atStartOfDay();
            LocalDateTime toTs = to.plusDays(1).atStartOfDay().minusNanos(1);

            // ---- EXIT records — no type filter, include everyone ----
            List<Map<String, Object>> exitRecords = railwayExitLogRepository
                .findByExitTimeBetweenOrderByExitTimeDesc(fromTs, toTs)
                .stream()
                .map(e -> buildExitMap(e, "EXIT"))
                .collect(Collectors.toList());

            // ---- ENTRY records — no type filter, include everyone ----
            List<Map<String, Object>> entryRecords = railwayEntryRepository
                .findByTimestampBetweenOrderByTimestampDesc(fromTs, toTs)
                .stream()
                .map(e -> buildEntryMap(e, "ENTRY"))
                .collect(Collectors.toList());

            // ---- Merge and sort by time descending ----
            List<Map<String, Object>> combined = new java.util.ArrayList<>();
            combined.addAll(exitRecords);
            combined.addAll(entryRecords);
            combined.sort((a, b) -> {
                LocalDateTime ta = (LocalDateTime) a.get("time");
                LocalDateTime tb = (LocalDateTime) b.get("time");
                if (ta == null && tb == null) return 0;
                if (ta == null) return 1;
                if (tb == null) return -1;
                return tb.compareTo(ta);
            });

            return ResponseEntity.ok(Map.of(
                "success", true,
                "fromDate", from.toString(),
                "toDate", to.toString(),
                "count", combined.size(),
                "logs", combined
            ));
        } catch (Exception e) {
            log.error("Error fetching admin gate logs", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch admin gate logs: " + e.getMessage()
            ));
        }
    }

    // ==================== HELPER: build unified map from Exit_logs row ====================
    private Map<String, Object> buildExitMap(com.example.visitor.entity.RailwayExitLog e, String scanType) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", "exit-" + e.getId());
        map.put("scanType", scanType);
        map.put("userType", resolveUserTypeLabel(e.getUserType(), e.getUserId()));
        map.put("userId", e.getUserId());
        map.put("time", e.getExitTime());

        // Resolve name
        String resolvedName = e.getPersonName();
        if (resolvedName == null || resolvedName.isBlank() || resolvedName.startsWith("Visitor-")) {
            resolvedName = resolvePersonName(e.getUserId(), e.getUserType());
        }
        map.put("name", resolvedName != null ? resolvedName : e.getUserId());

        // Resolve department
        String dept = e.getDepartment();
        if (dept == null || dept.isBlank()) {
            dept = resolvePersonDepartment(e.getUserId(), e.getUserType());
        }
        map.put("department", dept != null ? dept : "-");

        // Resolve purpose
        String purpose = e.getPurpose();
        if ((purpose == null || purpose.isBlank()) && e.getQrId() != null) {
            purpose = resolvePurposeFromQr(e.getQrId());
        }
        // Fallback: resolve from Visitor table for visitor types
        if ((purpose == null || purpose.isBlank()) && e.getUserType() != null) {
            String ut = e.getUserType().toUpperCase();
            if ("VISITOR".equals(ut) || "VG".equals(ut) || "VENDOR".equals(ut)) {
                purpose = resolveVisitorPurpose(e.getUserId());
            }
        }
        map.put("purpose", purpose != null ? purpose : "-");
        map.put("location", e.getLocation() != null ? e.getLocation() : e.getScanLocation());
        map.put("verifiedBy", e.getVerifiedBy());
        return map;
    }

    // ==================== HELPER: build unified map from Entry row ====================
    private Map<String, Object> buildEntryMap(com.example.visitor.entity.RailwayEntry e, String scanType) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", "entry-" + e.getId());
        map.put("scanType", scanType);
        map.put("userType", resolveUserTypeLabel(e.getUserType(), e.getUserId()));
        map.put("userId", e.getUserId());
        map.put("time", e.getTimestamp());

        // Resolve name
        String resolvedName = e.getPersonName();
        if (resolvedName == null || resolvedName.isBlank() || resolvedName.startsWith("Visitor-")) {
            resolvedName = resolvePersonName(e.getUserId(), e.getUserType());
        }
        map.put("name", resolvedName != null ? resolvedName : e.getUserId());

        // Resolve department
        String dept = e.getDepartment();
        if (dept == null || dept.isBlank()) {
            dept = resolvePersonDepartment(e.getUserId(), e.getUserType());
        }
        map.put("department", dept != null ? dept : "-");

        // Purpose from QR if available
        String purpose = null;
        if (e.getQrId() != null) {
            purpose = resolvePurposeFromQr(e.getQrId());
        }
        // Fallback: resolve from Visitor table for visitor types
        if ((purpose == null || purpose.isBlank()) && e.getUserType() != null) {
            String ut = e.getUserType().toUpperCase();
            if ("VISITOR".equals(ut) || "VG".equals(ut) || "VENDOR".equals(ut)) {
                purpose = resolveVisitorPurpose(e.getUserId());
            }
        }
        map.put("purpose", purpose != null ? purpose : "-");
        map.put("location", e.getScanLocation());
        map.put("verifiedBy", e.getScannedBy());
        return map;
    }

    // ==================== SHARED RESOLVERS ====================
    private String resolvePersonName(String userId, String userType) {
        if (userId == null || userId.isBlank()) return null;
        String utype = userType != null ? userType.toUpperCase() : "";
        try {
            if ("STUDENT".equals(utype)) {
                return studentRepository.findByRegNo(userId).map(s -> s.getFullName()).orElse(userId);
            } else if ("STAFF".equals(utype) || "HOD".equals(utype)) {
                String name = staffRepository.findByStaffCode(userId).map(s -> s.getStaffName()).orElse(null);
                if (name == null) {
                    name = hodRepository.findByHodCode(userId).map(h -> h.getHodName()).orElse(userId);
                }
                return name;
            } else if ("VISITOR".equals(utype) || "VG".equals(utype) || "VENDOR".equals(utype)) {
                try {
                    Long visitorId = Long.parseLong(userId);
                    return visitorRepository.findById(visitorId).map(v -> v.getName()).orElse("Visitor-" + userId);
                } catch (NumberFormatException nfe) {
                    return "Visitor-" + userId;
                }
            }
        } catch (Exception ex) { /* ignore */ }
        return userId;
    }

    private String resolvePersonDepartment(String userId, String userType) {
        if (userId == null || userId.isBlank()) return null;
        String utype = userType != null ? userType.toUpperCase() : "";
        try {
            if ("STUDENT".equals(utype)) {
                return studentRepository.findByRegNo(userId).map(s -> s.getDepartment()).orElse(null);
            } else if ("STAFF".equals(utype)) {
                return staffRepository.findByStaffCode(userId).map(s -> s.getDepartment()).orElse(null);
            } else if ("HOD".equals(utype)) {
                return hodRepository.findByHodCode(userId).map(h -> h.getDepartment()).orElse(null);
            } else if ("VISITOR".equals(utype) || "VG".equals(utype) || "VENDOR".equals(utype)) {
                try {
                    Long visitorId = Long.parseLong(userId);
                    return visitorRepository.findById(visitorId).map(v -> v.getDepartment()).orElse(null);
                } catch (NumberFormatException nfe) {
                    return null;
                }
            }
        } catch (Exception ex) { /* ignore */ }
        return null;
    }

    private String resolvePurposeFromQr(Long qrId) {
        try {
            com.example.visitor.entity.QRTable qr = qrTableRepository.findById(qrId).orElse(null);
            if (qr != null && qr.getPassRequestId() != null) {
                var gprOpt = gatePassRequestRepository.findById(qr.getPassRequestId());
                if (gprOpt.isPresent()) {
                    var gpr = gprOpt.get();
                    return gpr.getPurpose() != null ? gpr.getPurpose() : gpr.getReason();
                }
            }
        } catch (Exception ex) { /* ignore */ }
        return null;
    }
    private String resolveVisitorPurpose(String userId) {
        if (userId == null || userId.isBlank()) return null;
        try {
            Long visitorId = Long.parseLong(userId);
            return visitorRepository.findById(visitorId).map(v -> v.getPurpose()).orElse(null);
        } catch (NumberFormatException nfe) {
            return null;
        } catch (Exception ex) { return null; }
    }

    private String normalizeUserTypeLabel(String rawType) {
        if (rawType == null) return "UNKNOWN";
        switch (rawType.toUpperCase()) {
            case "VG":       return "VISITOR";
            case "VENDOR":   return "VENDOR";
            case "VISITOR":  return "VISITOR";
            case "STUDENT":  return "STUDENT";
            case "STAFF":    return "STAFF";
            case "HOD":      return "HOD";
            default:         return rawType.toUpperCase();
        }
    }

    /**
     * Resolves the display label for userType. For VG/VISITOR types,
     * looks up the Visitor table to check if role is VENDOR or VISITOR.
     */
    private String resolveUserTypeLabel(String rawType, String userId) {
        if (rawType == null) return "UNKNOWN";
        String upper = rawType.toUpperCase();
        if ("VG".equals(upper) || "VISITOR".equals(upper)) {
            if (userId != null && !userId.isBlank()) {
                try {
                    Long visitorId = Long.parseLong(userId);
                    String role = visitorRepository.findById(visitorId)
                        .map(v -> v.getRole() != null ? v.getRole().toUpperCase() : "VISITOR")
                        .orElse("VISITOR");
                    return "VENDOR".equals(role) ? "VENDOR" : "VISITOR";
                } catch (NumberFormatException nfe) { /* fall through */ }
            }
            return "VISITOR";
        }
        return normalizeUserTypeLabel(rawType);
    }

}
