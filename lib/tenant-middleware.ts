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
    const result = await query(`
      SELECT e.tenant_id, e.organization_id, e.email, o.name as organization_name, 
             o.subscription_status, o.subscription_plan
      FROM employees e
      LEFT JOIN organizations o ON e.organization_id = o.id
      WHERE e.id = $1
    `, [userId])

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

export function addTenantFilter(query: string, tenantId: string): string {
  // Add tenant_id filter to existing WHERE clause or create new one
  if (query.toLowerCase().includes('where')) {
    return query.replace(/where/gi, `WHERE tenant_id = '${tenantId}' AND `)
  } else {
    return `${query} WHERE tenant_id = '${tenantId}'`
  }
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

// Middleware function to extract tenant context from request
export function extractTenantFromRequest(request: NextRequest): string | null {
  // Try to get tenant from headers first
  const tenantHeader = request.headers.get('x-tenant-id')
  if (tenantHeader) {
    return tenantHeader
  }

  // Try to get from URL params
  const url = new URL(request.url)
  const tenantParam = url.searchParams.get('tenant_id')
  if (tenantParam) {
    return tenantParam
  }

  // Try to get from request body (for POST requests)
  // Note: This would need to be handled in the route handler since we can't read body twice
  return null
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
