package com.example.visitor.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Vehicle")
public class VehicleRegistration {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "license_plate", nullable = false)
    private String licensePlate;
    
    @Column(name = "owner_name", nullable = false)
    private String ownerName;
    
    @Column(name = "owner_phone", nullable = false)
    private String ownerPhone;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "owner_type", nullable = false)
    private PersonType ownerType; // VISITOR, STUDENT, FACULTY
    
    @Column(name = "vehicle_type")
    private String vehicleType; // Car, Bike, etc.
    
    @Column(name = "vehicle_model")
    private String vehicleModel;
    
    @Column(name = "vehicle_color")
    private String vehicleColor;
    
    @Column(name = "registered_by")
    private String registeredBy; // Security personnel who registered
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructors
    public VehicleRegistration() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public VehicleRegistration(String licensePlate, String ownerName, String ownerPhone, PersonType ownerType) {
        this();
        this.licensePlate = licensePlate;
        this.ownerName = ownerName;
        this.ownerPhone = ownerPhone;
        this.ownerType = ownerType;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getLicensePlate() { return licensePlate; }
    public void setLicensePlate(String licensePlate) { this.licensePlate = licensePlate; }
    
    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    
    public String getOwnerPhone() { return ownerPhone; }
    public void setOwnerPhone(String ownerPhone) { this.ownerPhone = ownerPhone; }
    
    public PersonType getOwnerType() { return ownerType; }
    public void setOwnerType(PersonType ownerType) { this.ownerType = ownerType; }
    
    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
    
    public String getVehicleModel() { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }
    
    public String getVehicleColor() { return vehicleColor; }
    public void setVehicleColor(String vehicleColor) { this.vehicleColor = vehicleColor; }
    
    public String getRegisteredBy() { return registeredBy; }
    public void setRegisteredBy(String registeredBy) { this.registeredBy = registeredBy; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}