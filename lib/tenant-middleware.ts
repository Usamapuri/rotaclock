import { NextRequest, NextResponse } from 'next/server'
import { query } from './database'

export interface TenantContext {
  tenant_id: string
  organization_id: string
  organization_name: string
  subscription_status: string
  subscription_plan: string
}

export async function getTenantContext(userId: string): Promise<TenantContext | null> {
  try {
    // SECURITY DEFINER lookup so tenant resolution works before app.tenant_id is
    // set (under RLS a plain employees/organizations read returns nothing
    // pre-tenant). See migration 007.
    const result = await query(`SELECT * FROM auth_tenant_context($1)`, [userId])

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      tenant_id: row.tenant_id,
      organization_id: row.organization_id,
      organization_name: row.organization_name,
      subscription_status: row.subscription_status,
      subscription_plan: row.subscription_plan
    }
  } catch (error) {
    console.error('Error getting tenant context:', error)
    return null
  }
}

export function validateTenantAccess(userTenantId: string, requestedTenantId?: string): boolean {
  // If no specific tenant is requested, allow access to user's own tenant
  if (!requestedTenantId) {
    return true
  }

  // User can only access their own tenant
  return userTenantId === requestedTenantId
}

export function validateSubscriptionStatus(subscriptionStatus: string): boolean {
  // Allow access for active, trial, and pending statuses
  const allowedStatuses = ['active', 'trial', 'pending']
  return allowedStatuses.includes(subscriptionStatus)
}

export function checkFeatureAccess(subscriptionPlan: string, feature: string): boolean {
  const featureAccess = {
    starter: ['basic_scheduling', 'time_tracking', 'payroll_calculation'],
    professional: ['basic_scheduling', 'time_tracking', 'payroll_calculation', 'advanced_analytics', 'api_access'],
    enterprise: ['basic_scheduling', 'time_tracking', 'payroll_calculation', 'advanced_analytics', 'api_access', 'white_label', 'custom_integrations']
  }

  const planFeatures = featureAccess[subscriptionPlan as keyof typeof featureAccess] || []
  return planFeatures.includes(feature)
}

// Helper function to create tenant-aware response
export function createTenantResponse(data: any, tenantContext: TenantContext) {
  return {
    ...data,
    tenant: {
      id: tenantContext.tenant_id,
      organization_id: tenantContext.organization_id,
      organization_name: tenantContext.organization_name,
      subscription_status: tenantContext.subscription_status,
      subscription_plan: tenantContext.subscription_plan
    }
  }
}
