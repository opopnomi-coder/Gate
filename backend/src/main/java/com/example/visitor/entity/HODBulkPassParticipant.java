package com.example.visitor.entity;

/**
 * Bulk pass participants are stored as comma-separated lists in Gatepass.student_list
 * and Gatepass.staff_list columns. This class is kept for backward compatibility only.
 */
public class HODBulkPassParticipant {
    public enum ParticipantType { student, staff, hod }

    private Long id;
    private HODBulkGatePassRequest request;
    private String participantId;
    private ParticipantType participantType;
    private String participantName;
    private Boolean isReceiver = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public HODBulkGatePassRequest getRequest() { return request; }
    public void setRequest(HODBulkGatePassRequest request) { this.request = request; }
    public String getParticipantId() { return participantId; }
    public void setParticipantId(String participantId) { this.participantId = participantId; }
    public ParticipantType getParticipantType() { return participantType; }
    public void setParticipantType(ParticipantType participantType) { this.participantType = participantType; }
    public String getParticipantName() { return participantName; }
    public void setParticipantName(String participantName) { this.participantName = participantName; }
    public Boolean getIsReceiver() { return isReceiver; }
    public void setIsReceiver(Boolean isReceiver) { this.isReceiver = isReceiver; }
}
