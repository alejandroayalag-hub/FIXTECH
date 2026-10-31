-- Add role field to usuarios table
-- role: 'admin' | 'rh', default 'admin'
-- Default 'admin' ensures the existing bootstrap user keeps full access with no data migration needed
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'admin'
  CHECK (role IN ('admin', 'rh'));
