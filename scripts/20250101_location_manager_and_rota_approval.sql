-- =====================================================
-- MIGRATION: Location Manager Role & Rota Approval Workflow
-- =====================================================
-- Implements:
-- 1. Location managers with scoped permissions
-- 2. Rota publish approval workflow
-- 3. Location-based data filtering
-- Date: 2025-01-01
-- =====================================================

BEGIN;

-- =====================================================
-- 0. FIX PRIMARY KEY CONSTRAINTS (if needed)
-- =====================================================

-- Ensure rotas table has primary key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'rotas' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE rotas ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added PRIMARY KEY constraint to rotas table';
  END IF;
END$$;

-- =====================================================
-- 1. ADD MANAGER_ID TO LOCATIONS
-- =====================================================

-- Add manager_id column to locations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'locations' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE locations ADD COLUMN manager_id UUID REFERENCES employees(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added manager_id column to locations';
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_locations_manager_id ON locations(manager_id);
    RAISE NOTICE 'Created index on locations.manager_id';
  END IF;
END$$;

-- =====================================================
-- 2. ADD STATUS TO ROTAS TABLE
-- =====================================================

-- Create enum type for rota status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rota_status_enum') THEN
    CREATE TYPE rota_status_enum AS ENUM ('draft', 'pending_approval', 'published');
    RAISE NOTICE 'Created rota_status_enum type';
  END IF;
END$$;

-- Add is_published column to rotas if missing (for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rotas' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE rotas ADD COLUMN is_published BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_published column to rotas';
  END IF;
END$$;

-- Add status column to rotas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rotas' AND column_name = 'status'
  ) THEN
    ALTER TABLE rotas ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
    RAISE NOTICE 'Added status column to rotas';
    
    -- Add check constraint
    ALTER TABLE rotas ADD CONSTRAINT rotas_status_check 
      CHECK (status IN ('draft', 'pending_approval', 'published'));
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_rotas_status ON rotas(status);
    RAISE NOTICE 'Created index on rotas.status';
  END IF;
END$$;

-- Add location_id to rotas if not exists (for location scoping)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rotas' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE rotas ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added location_id column to rotas';
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_rotas_location_id ON rotas(location_id);
    RAISE NOTICE 'Created index on rotas.location_id';
  END IF;
END$$;

-- =====================================================
-- 3. CREATE ROTA PUBLISH REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS rota_publish_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(80) NOT NULL,
    rota_id UUID NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    admin_note TEXT,
    reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Tenant isolation
    UNIQUE(tenant_id, id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rota_publish_requests_tenant_id ON rota_publish_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rota_publish_requests_rota_id ON rota_publish_requests(rota_id);
CREATE INDEX IF NOT EXISTS idx_rota_publish_requests_manager_id ON rota_publish_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_rota_publish_requests_status ON rota_publish_requests(status);

-- Partial unique index: only one pending request per rota
CREATE UNIQUE INDEX IF NOT EXISTS idx_rota_publish_requests_pending_unique 
  ON rota_publish_requests(rota_id) 
  WHERE status = 'pending';

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_rota_publish_requests_updated_at ON rota_publish_requests;
CREATE TRIGGER update_rota_publish_requests_updated_at
    BEFORE UPDATE ON rota_publish_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. UPDATE EXISTING ROTAS TO 'published' STATUS
-- =====================================================

-- Set all existing is_published=true rotas to 'published' status
UPDATE rotas 
SET status = 'published' 
WHERE is_published = true AND status = 'draft';

-- Set all existing is_published=false rotas to 'draft' status
UPDATE rotas 
SET status = 'draft' 
WHERE is_published = false AND status = 'draft';

-- =====================================================
-- 5. ADD LOCATION_ID TO OTHER TABLES (if needed)
-- =====================================================

-- Add location_id to teams if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added location_id column to teams';
    CREATE INDEX IF NOT EXISTS idx_teams_location_id ON teams(location_id);
  END IF;
END$$;

-- Add location_id to leave_requests if not exists (via employee)
-- Note: Leave requests are implicitly scoped by employee's location

-- Add location_id to shift_swaps if not exists (via employee)
-- Note: Shift swaps are implicitly scoped by employee's location

-- =====================================================
-- 6. CREATE HELPER VIEW FOR MANAGER PERMISSIONS
-- =====================================================

-- View to get manager's location and permissions
CREATE OR REPLACE VIEW manager_location_access AS
SELECT 
    e.id as employee_id,
    e.tenant_id,
    e.role,
    l.id as location_id,
    l.name as location_name,
    l.manager_id as is_assigned_manager
FROM employees e
LEFT JOIN locations l ON l.manager_id = e.id
WHERE e.role = 'manager' AND e.is_active = true;

-- =====================================================
-- 7. ADD AUDIT LOG FOR ROTA APPROVALS
-- =====================================================

-- Create audit log table for rota status changes
CREATE TABLE IF NOT EXISTS rota_status_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(80) NOT NULL,
    rota_id UUID NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rota_status_audit_tenant_id ON rota_status_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rota_status_audit_rota_id ON rota_status_audit(rota_id);
CREATE INDEX IF NOT EXISTS idx_rota_status_audit_changed_by ON rota_status_audit(changed_by);

-- =====================================================
-- 8. CREATE FUNCTION TO LOG ROTA STATUS CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION log_rota_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO rota_status_audit (
            tenant_id, rota_id, old_status, new_status, changed_by
        ) VALUES (
            NEW.tenant_id, 
            NEW.id, 
            OLD.status, 
            NEW.status,
            COALESCE(NEW.updated_by, NEW.created_by)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to rotas table
DROP TRIGGER IF EXISTS rotas_status_change_audit ON rotas;
CREATE TRIGGER rotas_status_change_audit
    AFTER UPDATE ON rotas
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_rota_status_change();

COMMIT;

-- =====================================================
-- POST-MIGRATION NOTES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Changes applied:';
  RAISE NOTICE '  ✓ Added manager_id to locations';
  RAISE NOTICE '  ✓ Added status (draft/pending_approval/published) to rotas';
  RAISE NOTICE '  ✓ Added location_id to rotas for location scoping';
  RAISE NOTICE '  ✓ Created rota_publish_requests table';
  RAISE NOTICE '  ✓ Created rota_status_audit table';
  RAISE NOTICE '  ✓ Added location_id to teams';
  RAISE NOTICE '  ✓ Created manager_location_access view';
  RAISE NOTICE '  ✓ Added audit logging for rota status changes';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Next steps:';
  RAISE NOTICE '  1. Assign managers to locations in admin panel';
  RAISE NOTICE '  2. Update API routes with location scoping';
  RAISE NOTICE '  3. Test manager workflow: create rota → request publish → admin approve';
  RAISE NOTICE '  4. Restart your application';
END$$;

