-- Add vehicle_type column to Visitor table (or resize if already exists)
ALTER TABLE Visitor ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(100) NULL;
ALTER TABLE Visitor MODIFY COLUMN vehicle_type VARCHAR(100) NULL;
