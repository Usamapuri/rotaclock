-- Super admin platform tables (idempotent). Apply with:
--   node scripts/run_sql.js "$DATABASE_URL" scripts/migrations/001_super_admin_platform.sql

CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_signup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by_super_admin_id UUID REFERENCES super_admins(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_organization_id UUID REFERENCES organizations(id),
    created_admin_employee_id UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_tenant_signup_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES super_admins(id),
    action VARCHAR(100) NOT NULL,
    subject_tenant_id VARCHAR(80),
    subject_user_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_signup_requests_status_created ON tenant_signup_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_super_admin_created ON platform_audit_logs(super_admin_id, created_at DESC);

ALTER TABLE organization_admins ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
