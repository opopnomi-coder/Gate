package com.example.visitor.entity;

/**
 * Visitor gate pass requests are stored in the Visitor table.
 * Use the Visitor entity directly for all visitor gate pass operations.
 * This class is kept as a type alias for backward compatibility.
 */
public class VisitorGatepassRequest extends Visitor {
    public VisitorGatepassRequest() {
        super();
    }

    // Compat getters mapping VisitorGatepassRequest field names to Visitor fields
    public String getVisitorName() { return getName(); }
    public void setVisitorName(String name) { setName(name); }
    public String getVisitorPhone() { return getPhone(); }
    public void setVisitorPhone(String phone) { setPhone(phone); }
    public String getVisitorEmail() { return getEmail(); }
    public void setVisitorEmail(String email) { setEmail(email); }
    public String getAssignedStaffId() { return getStaffCode(); }
    public void setAssignedStaffId(String staffId) { setStaffCode(staffId); }
    public String getRequestStatus() { return getStatus(); }
    public void setRequestStatus(String status) { setStatus(status); }
    public String getStaffApproval() { return getStatus(); }
    public void setStaffApproval(String approval) { /* status field covers this */ }
    public String getQrCodeData() { return getQrCode(); }
    public void setQrCodeData(String qrCode) { setQrCode(qrCode); }
    public boolean getQrGenerated() { return getQrCode() != null; }
    public void setQrGenerated(boolean generated) { /* derived */ }
    public boolean getQrUsed() { return getScanCount() != null && getScanCount() > 0; }
    public void setQrUsed(boolean used) { /* derived from scan_count */ }
}
