/**
 * Location-Based Permission Helpers
 * 
 * Implements scoped permissions for Location Managers:
 * - Managers can only see/modify data for their assigned location
 * - Admins have full access to all locations
 * - Agents can only see published rotas and their own data
 */

import { query } from './database'

export interface LocationPermission {
  canAccessLocation: boolean
  locationId?: string
  locationIds?: string[]
  isAdmin: boolean
  isManager: boolean
  isAgent: boolean
}

/**
 * Get the location(s) that a user has access to
 */
export async function getUserLocationAccess(
  userId: string,
  role: string,
  tenantId: string
): Promise<LocationPermission> {
  
  // Admins have access to all locations in their tenant
  if (role === 'admin') {
    const locations = await query(`
      SELECT id FROM locations 
      WHERE tenant_id = $1 AND is_active = true
    `, [tenantId])
    
    return {
      canAccessLocation: true,
      locationIds: locations.rows.map(l => l.id),
      isAdmin: true,
      isManager: false,
      isAgent: false
    }
  }
  
  // Managers only have access to their assigned location
  if (role === 'manager') {
    const result = await query(`
      SELECT l.id as location_id
      FROM locations l
      WHERE l.manager_id = $1 
        AND l.tenant_id = $2 
        AND l.is_active = true
      LIMIT 1
    `, [userId, tenantId])
    
    if (result.rows.length === 0) {
      return {
        canAccessLocation: false,
        isAdmin: false,
        isManager: true,
        isAgent: false
      }
    }
    
    return {
      canAccessLocation: true,
      locationId: result.rows[0].location_id,
      locationIds: [result.rows[0].location_id],
      isAdmin: false,
      isManager: true,
      isAgent: false
    }
  }
  
  // Agents only see their own data (via their location)
  const result = await query(`
    SELECT location_id 
    FROM employees 
    WHERE id = $1 AND tenant_id = $2
  `, [userId, tenantId])
  
  return {
    canAccessLocation: result.rows.length > 0,
    locationId: result.rows[0]?.location_id,
    locationIds: result.rows[0]?.location_id ? [result.rows[0].location_id] : [],
    isAdmin: false,
    isManager: false,
    isAgent: true
  }
}

/**
 * Check if user can manage a specific location
 */
export async function canManageLocation(
  userId: string,
  role: string,
  locationId: string,
  tenantId: string
): Promise<boolean> {
  if (role === 'admin') {
    return true
  }
  
  if (role === 'manager') {
    const result = await query(`
      SELECT 1 FROM locations 
      WHERE id = $1 
        AND manager_id = $2 
        AND tenant_id = $3 
        AND is_active = true
    `, [locationId, userId, tenantId])
    
    return result.rows.length > 0
  }
  
  return false
}

/**
 * Get location filter SQL clause for queries
 */
export function getLocationFilterSQL(
  permission: LocationPermission,
  tableAlias: string = ''
): { clause: string; params: string[] } {
  
  if (permission.isAdmin) {
    // Admins see everything in their tenant (no location filter needed)
    return { clause: '', params: [] }
  }
  
  if (permission.isManager && permission.locationId) {
    // Managers only see their location
    const prefix = tableAlias ? `${tableAlias}.` : ''
    return {
      clause: `AND ${prefix}location_id = $`,
      params: [permission.locationId]
    }
  }
  
  if (permission.isAgent && permission.locationId) {
    // Agents see their own location
    const prefix = tableAlias ? `${tableAlias}.` : ''
    return {
      clause: `AND ${prefix}location_id = $`,
      params: [permission.locationId]
    }
  }
  
  // No access - return impossible condition
  return { clause: 'AND 1=0', params: [] }
}

/**
 * Get employees filtered by location access
 */
export async function getLocationEmployees(
  permission: LocationPermission,
  tenantId: string
): Promise<any[]> {
  let queryText = `
    SELECT e.* 
    FROM employees e
    WHERE e.tenant_id = $1 AND e.is_active = true
  `
  const params: any[] = [tenantId]
  
  if (!permission.isAdmin && permission.locationId) {
    params.push(permission.locationId)
    queryText += ` AND e.location_id = $${params.length}`
  }
  
  queryText += ' ORDER BY e.first_name, e.last_name'
  
  const result = await query(queryText, params)
  return result.rows
}

/**
 * Check if user can publish rotas (admin only)
 */
export function canPublishRota(role: string): boolean {
  return role === 'admin'
}

/**
 * Check if user can request rota publish (manager or admin)
 */
export function canRequestRotaPublish(role: string): boolean {
  return role === 'manager' || role === 'admin'
}

/**
 * Get location ID from employee ID
 */
export async function getEmployeeLocation(
  employeeId: string,
  tenantId: string
): Promise<string | null> {
  const result = await query(`
    SELECT location_id 
    FROM employees 
    WHERE id = $1 AND tenant_id = $2
  `, [employeeId, tenantId])
  
  return result.rows[0]?.location_id || null
}

/**
 * Validate that all employees in a list belong to the manager's location
 */
export async function validateEmployeesInLocation(
  employeeIds: string[],
  locationId: string,
  tenantId: string
): Promise<boolean> {
  if (employeeIds.length === 0) return true
  
  const result = await query(`
    SELECT COUNT(*) as count
    FROM employees
    WHERE id = ANY($1::uuid[])
      AND location_id = $2
      AND tenant_id = $3
  `, [employeeIds, locationId, tenantId])
  
  return parseInt(result.rows[0].count) === employeeIds.length
}

/**
 * Get manager info for a location
 */
export async function getLocationManager(
  locationId: string,
  tenantId: string
): Promise<any | null> {
  const result = await query(`
    SELECT e.*
    FROM employees e
    JOIN locations l ON l.manager_id = e.id
    WHERE l.id = $1 AND l.tenant_id = $2
  `, [locationId, tenantId])
  
  return result.rows[0] || null
}

