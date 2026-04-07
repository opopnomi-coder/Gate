package com.example.visitor.repository;

import com.example.visitor.entity.VehicleRegistration;
import com.example.visitor.entity.PersonType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRegistrationRepository extends JpaRepository<VehicleRegistration, Long> {
    Optional<VehicleRegistration> findByLicensePlate(String licensePlate);
    List<VehicleRegistration> findByOwnerType(PersonType ownerType);
    List<VehicleRegistration> findByOwnerName(String ownerName);
    List<VehicleRegistration> findByOwnerPhone(String ownerPhone);
    Optional<VehicleRegistration> findFirstByRegisteredBy(String registeredBy);
}