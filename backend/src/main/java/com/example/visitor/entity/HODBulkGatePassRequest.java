package com.example.visitor.entity;

/**
 * HOD bulk gate pass requests are stored in the Gatepass table.
 * Use GatePassRequest with pass_type='BULK' and user_type='STAFF'.
 * This class is kept as a type alias for backward compatibility.
 */
public class HODBulkGatePassRequest extends GatePassRequest {
    public HODBulkGatePassRequest() {
        super();
        setPassType("BULK");
        setUserType("STAFF");
    }
}
