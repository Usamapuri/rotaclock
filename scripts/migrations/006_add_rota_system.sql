-- Add Rota System Migration
-- This migration adds support for the "create and publish" rota workflow

-- Create rotas table
CREATE TABLE IF NOT EXISTS rotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(80) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    week_start_date DATE NOT NULL,
    status VARCHAR(32) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    published_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, name, week_start_date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rotas_tenant ON rotas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rotas_tenant_status ON rotas(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rotas_tenant_week ON rotas(tenant_id, week_start_date);

-- Add rota_id to shift_assignments table
ALTER TABLE shift_assignments 
ADD COLUMN IF NOT EXISTS rota_id UUID REFERENCES rotas(id) ON DELETE SET NULL;

-- Add published status to shift_assignments
ALTER TABLE shift_assignments 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_shift_assignments_rota ON shift_assignments(rota_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_published ON shift_assignments(is_published);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_tenant_published ON shift_assignments(tenant_id, is_published);

-- Add foreign key constraint for rota_id (with tenant validation)
ALTER TABLE IF EXISTS shift_assignments
  ADD CONSTRAINT shift_assignments_rota_fk
  FOREIGN KEY (rota_id) REFERENCES rotas(id) DEFERRABLE INITIALLY IMMEDIATE;

-- Create a view for published shifts (what employees see)
CREATE OR REPLACE VIEW published_shift_assignments AS
SELECT 
    sa.*,
    r.name as rota_name,
    r.published_at as rota_published_at
FROM shift_assignments sa
LEFT JOIN rotas r ON sa.rota_id = r.id
WHERE sa.is_published = TRUE AND (r.status = 'published' OR sa.rota_id IS NULL);

-- Create a view for draft shifts (what admins see during creation)
CREATE OR REPLACE VIEW draft_shift_assignments AS
SELECT 
    sa.*,
    r.name as rota_name,
    r.status as rota_status
FROM shift_assignments sa
LEFT JOIN rotas r ON sa.rota_id = r.id
WHERE sa.is_published = FALSE OR r.status = 'draft';

-- Add notification tracking for published rotas
CREATE TABLE IF NOT EXISTS rota_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(80) NOT NULL,
    rota_id UUID NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    notification_type VARCHAR(32) DEFAULT 'rota_published' CHECK (notification_type IN ('rota_published', 'shift_assigned', 'shift_changed')),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, rota_id, employee_id, notification_type)
);

-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_rota_notifications_tenant ON rota_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rota_notifications_employee ON rota_notifications(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_rota_notifications_unread ON rota_notifications(tenant_id, employee_id, is_read);

-- Update existing shift_assignments to be published (backward compatibility)
UPDATE shift_assignments 
SET is_published = TRUE 
WHERE is_published IS NULL OR is_published = FALSE;

-- Add comments for documentation
COMMENT ON TABLE rotas IS 'Stores rota schedules that can be created as drafts and then published to employees';
COMMENT ON COLUMN rotas.status IS 'draft: being created, published: visible to employees, archived: completed rota';
COMMENT ON COLUMN shift_assignments.rota_id IS 'Links shift assignment to a specific rota for batch operations';
COMMENT ON COLUMN shift_assignments.is_published IS 'Whether this shift is visible to employees';
COMMENT ON TABLE rota_notifications IS 'Tracks notifications sent to employees when rotas are published';
