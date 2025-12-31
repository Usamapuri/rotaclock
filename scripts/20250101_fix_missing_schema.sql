-- =====================================================
-- MIGRATION: Fix Missing Schema Elements for Railway
-- =====================================================
-- This migration adds the missing locations table and 
-- approval_status column to time_entries
-- Date: 2025-01-01
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE LOCATIONS TABLE
-- =====================================================
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
    
    -- Tenant isolation constraints
    UNIQUE(tenant_id, id),
    UNIQUE(tenant_id, name)
);

-- =====================================================
-- 2. CREATE MANAGER_LOCATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS manager_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(80) NOT NULL,
    manager_id UUID NOT NULL REFERENCES employees(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, manager_id, location_id)
);

-- =====================================================
-- 3. ADD LOCATION_ID TO EMPLOYEES (if missing)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN location_id UUID;
  END IF;
END$$;

-- Add foreign key constraint if it doesn't exist
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

-- =====================================================
-- 4. ADD APPROVAL COLUMNS TO TIME_ENTRIES
-- =====================================================

-- Add approval_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending';
  END IF;
END$$;

-- Add approved_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN approved_by UUID REFERENCES employees(id);
  END IF;
END$$;

-- Add approved_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END$$;

-- Add rejection_reason column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN rejection_reason TEXT;
  END IF;
END$$;

-- Add admin_notes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN admin_notes TEXT;
  END IF;
END$$;

-- Add approved_hours column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'approved_hours'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN approved_hours NUMERIC;
  END IF;
END$$;

-- Add approved_rate column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'approved_rate'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN approved_rate NUMERIC;
  END IF;
END$$;

-- Add total_pay column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'total_pay'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN total_pay NUMERIC;
  END IF;
END$$;

-- =====================================================
-- 5. CREATE TENANT_SETTINGS TABLE (if missing)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id VARCHAR(80) PRIMARY KEY,
    allow_manager_approvals BOOLEAN DEFAULT false,
    pay_period_type VARCHAR(20) DEFAULT 'weekly',
    custom_period_days INTEGER,
    week_start_day INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. CREATE PAY_PERIODS TABLE (if missing)
-- =====================================================
CREATE TABLE IF NOT EXISTS pay_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(80) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, start_date, end_date)
);

-- =====================================================
-- 7. ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Locations indexes
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON locations(organization_id);

-- Manager locations indexes
CREATE INDEX IF NOT EXISTS idx_manager_locations_tenant_id ON manager_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manager_locations_manager_id ON manager_locations(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_locations_location_id ON manager_locations(location_id);

-- Employee location index
CREATE INDEX IF NOT EXISTS idx_employees_location_id ON employees(location_id);

-- Time entries approval indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_approval_status ON time_entries(approval_status);
CREATE INDEX IF NOT EXISTS idx_time_entries_approved_by ON time_entries(approved_by);

-- =====================================================
-- 8. CREATE TRIGGER FOR UPDATED_AT (if missing)
-- =====================================================
DO $$
BEGIN
  -- Create trigger function if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $trigger$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
  END IF;
END$$;

-- Add triggers for locations
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add triggers for tenant_settings
DROP TRIGGER IF EXISTS update_tenant_settings_updated_at ON tenant_settings;
CREATE TRIGGER update_tenant_settings_updated_at
    BEFORE UPDATE ON tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify success:
-- SELECT COUNT(*) FROM locations;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'approval_status';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'location_id';

