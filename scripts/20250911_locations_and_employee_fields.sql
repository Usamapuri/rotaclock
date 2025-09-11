-- Migration: add locations, manager_locations and extended employee fields
-- Tenant isolation is enforced via tenant_id columns and composite uniques

BEGIN;

-- 1) Locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, id),
  UNIQUE(tenant_id, name)
);

-- 2) Mapping managers to locations they manage
CREATE TABLE IF NOT EXISTS manager_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  manager_id UUID NOT NULL REFERENCES employees(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, manager_id, location_id)
);

-- 3) Extend employees with address/emergency/notes and location_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'address'
  ) THEN
    ALTER TABLE employees ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'emergency_contact'
  ) THEN
    ALTER TABLE employees ADD COLUMN emergency_contact TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'emergency_phone'
  ) THEN
    ALTER TABLE employees ADD COLUMN emergency_phone TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'notes'
  ) THEN
    ALTER TABLE employees ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN location_id UUID;
  END IF;
END$$;

-- Optional: add FK after column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employees_location_id_fkey'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_location_id_fkey
      FOREIGN KEY (location_id) REFERENCES locations(id);
  END IF;
END$$;

COMMIT;


