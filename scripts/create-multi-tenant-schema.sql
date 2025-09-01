-- Multi-Tenant SaaS Database Schema
-- This script creates the organizations table and adds tenant_id to all existing tables

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) UNIQUE NOT NULL, -- Unique tenant identifier
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly organization name
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Pakistan',
    postal_code VARCHAR(20),
    industry VARCHAR(100),
    company_size VARCHAR(50), -- small, medium, large
    logo_url TEXT,
    website VARCHAR(255),
    
    -- Subscription and billing fields
    subscription_status VARCHAR(20) DEFAULT 'trial', -- trial, active, suspended, cancelled
    subscription_plan VARCHAR(20) DEFAULT 'basic', -- basic, premium, enterprise
    trial_start_date TIMESTAMPTZ DEFAULT NOW(),
    trial_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    
    -- Organization settings
    timezone VARCHAR(50) DEFAULT 'Asia/Karachi',
    currency VARCHAR(3) DEFAULT 'PKR',
    language VARCHAR(10) DEFAULT 'en',
    max_employees INTEGER DEFAULT 100,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Organization Admins Table
CREATE TABLE IF NOT EXISTS organization_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References employees_new(id)
    role VARCHAR(20) DEFAULT 'admin', -- admin, owner, manager
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 3. Add tenant_id to existing tables
-- Note: We'll create a separate migration script for this to handle existing data

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_tenant_id ON organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_email ON organizations(email);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_organization_admins_org_id ON organization_admins(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_admins_user_id ON organization_admins(user_id);

-- 5. Insert demo organization
INSERT INTO organizations (
    tenant_id,
    name,
    slug,
    email,
    subscription_status,
    subscription_plan,
    is_verified,
    is_active
) VALUES (
    'demo',
    'Demo Organization',
    'demo-organization',
    'demo@rotacloud.com',
    'trial',
    'basic',
    true,
    true
) ON CONFLICT (tenant_id) DO NOTHING;

-- 6. Add comments for documentation
COMMENT ON TABLE organizations IS 'Multi-tenant organizations table for SaaS platform';
COMMENT ON TABLE organization_admins IS 'Organization administrators and their roles';
COMMENT ON COLUMN organizations.tenant_id IS 'Unique tenant identifier for data isolation';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly organization name for routing';
COMMENT ON COLUMN organizations.subscription_status IS 'Current subscription status: trial, active, suspended, cancelled';
COMMENT ON COLUMN organizations.subscription_plan IS 'Subscription plan: basic, premium, enterprise';
