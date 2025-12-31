# Location Scoping - API Implementation Examples

This guide shows how to implement location scoping for Teams, Timesheets, and Leave Requests APIs.

## Pattern to Follow

```typescript
// 1. Get user authentication
const authMiddleware = createApiAuthMiddleware()
const { user, isAuthenticated } = await authMiddleware(request)

// 2. Get location access
const locationAccess = await getUserLocationAccess(
  user.id,
  user.role,
  tenantContext.tenant_id
)

// 3. Build query with location filter
let queryText = `SELECT ... FROM table WHERE tenant_id = $1`
const params = [tenantContext.tenant_id]

// 4. Add location scoping
if (locationAccess.isManager && locationAccess.locationId) {
  queryText += ` AND location_id = $${params.length + 1}`
  params.push(locationAccess.locationId)
}
```

---

## 1. Teams API with Location Scoping

```typescript
// app/api/teams/route.ts
import { getUserLocationAccess, canManageLocation } from '@/lib/location-permissions'

/**
 * GET /api/teams
 * - Admins: See all teams
 * - Managers: See only teams for their location
 * - Agents: See only their own team
 */
export async function GET(request: NextRequest) {
  // ... auth code ...
  
  const locationAccess = await getUserLocationAccess(
    user.id,
    user.role,
    tenantContext.tenant_id
  )

  let queryText = `
    SELECT 
      t.*,
      l.name as location_name,
      e.first_name as team_lead_first_name,
      e.last_name as team_lead_last_name,
      COUNT(DISTINCT ta.employee_id) as member_count
    FROM teams t
    LEFT JOIN locations l ON t.location_id = l.id
    LEFT JOIN employees e ON t.team_lead_id = e.id
    LEFT JOIN team_assignments ta ON t.id = ta.team_id AND ta.is_active = true
    WHERE t.tenant_id = $1 AND t.is_active = true
  `
  const params: any[] = [tenantContext.tenant_id]
  let paramIndex = 2

  // MANAGERS: Only their location
  if (locationAccess.isManager && locationAccess.locationId) {
    queryText += ` AND t.location_id = $${paramIndex}`
    params.push(locationAccess.locationId)
    paramIndex++
  }

  // AGENTS: Only their team
  if (locationAccess.isAgent) {
    queryText += ` AND ta.employee_id = $${paramIndex}`
    params.push(user.id)
    paramIndex++
  }

  queryText += `
    GROUP BY t.id, l.name, e.first_name, e.last_name
    ORDER BY t.name
  `

  const result = await query(queryText, params)
  return NextResponse.json({ success: true, data: result.rows })
}

/**
 * POST /api/teams
 * - Admins: Can create teams for any location
 * - Managers: Can only create teams for their location
 */
export async function POST(request: NextRequest) {
  // ... auth code ...
  
  if (user.role === 'agent') {
    return NextResponse.json({ 
      error: 'Agents cannot create teams' 
    }, { status: 403 })
  }

  const locationAccess = await getUserLocationAccess(
    user.id,
    user.role,
    tenantContext.tenant_id
  )

  const body = await request.json()
  const { name, department, team_lead_id, location_id } = body

  // Validate location_id for managers
  if (locationAccess.isManager) {
    if (!locationAccess.locationId) {
      return NextResponse.json({ 
        error: 'You are not assigned to a location' 
      }, { status: 403 })
    }

    // Manager must create team in their location
    if (location_id && location_id !== locationAccess.locationId) {
      return NextResponse.json({ 
        error: 'You can only create teams for your location' 
      }, { status: 403 })
    }
  }

  // Use manager's location or provided location_id
  const finalLocationId = locationAccess.isManager 
    ? locationAccess.locationId 
    : location_id

  const result = await query(`
    INSERT INTO teams (
      tenant_id, organization_id, name, department, 
      team_lead_id, location_id, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, true)
    RETURNING *
  `, [
    tenantContext.tenant_id,
    tenantContext.organization_id,
    name,
    department || null,
    team_lead_id || null,
    finalLocationId
  ])

  return NextResponse.json({ 
    success: true, 
    data: result.rows[0] 
  }, { status: 201 })
}
```

---

## 2. Timesheets API with Location Scoping

```typescript
// app/api/timesheets/route.ts OR app/api/admin/timesheet/route.ts

/**
 * GET /api/admin/timesheet
 * - Admins: See all timesheets
 * - Managers: See only timesheets for employees in their location
 */
export async function GET(request: NextRequest) {
  // ... auth code ...

  if (user.role !== 'admin' && user.role !== 'manager') {
    return NextResponse.json({ 
      error: 'Insufficient permissions' 
    }, { status: 403 })
  }

  const locationAccess = await getUserLocationAccess(
    user.id,
    user.role,
    tenantContext.tenant_id
  )

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const start_date = searchParams.get('start_date')
  const end_date = searchParams.get('end_date')

  let queryText = `
    SELECT 
      te.*,
      e.first_name,
      e.last_name,
      e.employee_code,
      e.location_id,
      l.name as location_name,
      sa.date as shift_date,
      st.name as shift_name
    FROM time_entries te
    JOIN employees e ON te.employee_id = e.id AND e.tenant_id = te.tenant_id
    LEFT JOIN locations l ON e.location_id = l.id
    LEFT JOIN shift_assignments sa ON te.shift_assignment_id = sa.id
    LEFT JOIN shift_templates st ON sa.template_id = st.id
    WHERE te.tenant_id = $1
  `
  const params: any[] = [tenantContext.tenant_id]
  let paramIndex = 2

  // MANAGERS: Only employees from their location
  if (locationAccess.isManager && locationAccess.locationId) {
    queryText += ` AND e.location_id = $${paramIndex}`
    params.push(locationAccess.locationId)
    paramIndex++
  }

  if (status) {
    queryText += ` AND te.status = $${paramIndex}`
    params.push(status)
    paramIndex++
  }

  if (start_date) {
    queryText += ` AND te.date >= $${paramIndex}`
    params.push(start_date)
    paramIndex++
  }

  if (end_date) {
    queryText += ` AND te.date <= $${paramIndex}`
    params.push(end_date)
    paramIndex++
  }

  queryText += ` ORDER BY te.date DESC, e.last_name, e.first_name`

  const result = await query(queryText, params)
  return NextResponse.json({ success: true, data: result.rows })
}

/**
 * PUT /api/admin/timesheet/[id]
 * Approve/reject timesheet entries
 * - Managers can only approve for their location
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // ... auth code ...

  if (user.role !== 'admin' && user.role !== 'manager') {
    return NextResponse.json({ 
      error: 'Insufficient permissions' 
    }, { status: 403 })
  }

  const locationAccess = await getUserLocationAccess(
    user.id,
    user.role,
    tenantContext.tenant_id
  )

  const timeEntryId = params.id
  const body = await request.json()
  const { approval_status, admin_notes } = body

  // Get the time entry and employee's location
  const timeEntryResult = await query(`
    SELECT te.*, e.location_id
    FROM time_entries te
    JOIN employees e ON te.employee_id = e.id
    WHERE te.id = $1 AND te.tenant_id = $2
  `, [timeEntryId, tenantContext.tenant_id])

  if (timeEntryResult.rows.length === 0) {
    return NextResponse.json({ 
      error: 'Time entry not found' 
    }, { status: 404 })
  }

  const timeEntry = timeEntryResult.rows[0]

  // MANAGERS: Can only approve entries from their location
  if (locationAccess.isManager) {
    if (timeEntry.location_id !== locationAccess.locationId) {
      return NextResponse.json({ 
        error: 'You can only approve timesheets for your location' 
      }, { status: 403 })
    }
  }

  // Update approval status
  const result = await query(`
    UPDATE time_entries
    SET approval_status = $1,
        approved_by = $2,
        approved_at = NOW(),
        admin_notes = $3,
        updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `, [approval_status, user.id, admin_notes || null, timeEntryId])

  return NextResponse.json({ 
    success: true, 
    data: result.rows[0] 
  })
}
```

---

## 3. Leave Requests API with Location Scoping

```typescript
// app/api/leave-requests/route.ts

/**
 * GET /api/leave-requests
 * - Admins: See all leave requests
 * - Managers: See only requests from their location
 * - Agents: See only their own requests
 */
export async function GET(request: NextRequest) {
  // ... auth code ...

  const locationAccess = await getUserLocationAccess(
    user.id,
    user.role,
    tenantContext.tenant_id
  )

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let queryText = `
    SELECT 
      lr.*,
      e.first_name,
      e.last_name,
      e.employee_code,
      e.location_id,
      l.name as location_name,
      e.department,
      app.first_name as approved_by_first_name,
      app.last_name as approved_by_last_name
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id AND e.tenant_id = lr.tenant_id
    LEFT JOIN locations l ON e.location_id = l.id
    LEFT JOIN employees app ON lr.approved_by = app.id
    WHERE lr.tenant_id = $1
  `
  const params: any[] = [tenantContext.tenant_id]
  let paramIndex = 2

  // AGENTS: Only their own requests
  if (locationAccess.isAgent) {
    queryText += ` AND lr.employee_id = $${paramIndex}`
    params.push(user.id)
    paramIndex++
  }

  // MANAGERS: Only requests from their location
  if (locationAccess.isManager && locationAccess.locationId) {
    queryText += ` AND e.location_id = $${paramIndex}`
    params.push(locationAccess.locationId)
    paramIndex++
  }

  if (status) {
    queryText += ` AND lr.status = $${paramIndex}`
    params.push(status)
    paramIndex++
  }

  queryText += ` ORDER BY lr.created_at DESC`

  const result = await query(queryText, params)
  return NextResponse.json({ success: true, data: result.rows })
}

/**
 * PUT /api/leave-requests/[id]
 * Approve/deny leave requests
 * - Managers can only approve for their location
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // ... auth code ...

  if (user.role !== 'admin' && user.role !== 'manager') {
    return NextResponse.json({ 
      error: 'Only admins and managers can approve leave requests' 
    }, { status: 403 })
  }

  const locationAccess = await getUserLocationAccess(
    user.id,
    user.role,
    tenantContext.tenant_id
  )

  const leaveRequestId = params.id
  const body = await request.json()
  const { status: newStatus, admin_notes } = body

  if (!['approved', 'denied'].includes(newStatus)) {
    return NextResponse.json({ 
      error: 'Status must be approved or denied' 
    }, { status: 400 })
  }

  // Get leave request with employee location
  const leaveResult = await query(`
    SELECT lr.*, e.location_id
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    WHERE lr.id = $1 AND lr.tenant_id = $2
  `, [leaveRequestId, tenantContext.tenant_id])

  if (leaveResult.rows.length === 0) {
    return NextResponse.json({ 
      error: 'Leave request not found' 
    }, { status: 404 })
  }

  const leaveRequest = leaveResult.rows[0]

  // MANAGERS: Can only approve requests from their location
  if (locationAccess.isManager) {
    if (leaveRequest.location_id !== locationAccess.locationId) {
      return NextResponse.json({ 
        error: 'You can only approve leave requests for your location' 
      }, { status: 403 })
    }
  }

  // Check if already processed
  if (leaveRequest.status !== 'pending') {
    return NextResponse.json({ 
      error: 'This request has already been processed' 
    }, { status: 400 })
  }

  // Update leave request
  const result = await query(`
    UPDATE leave_requests
    SET status = $1,
        approved_by = $2,
        approved_at = NOW(),
        admin_notes = $3,
        updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `, [newStatus, user.id, admin_notes || null, leaveRequestId])

  // Send notification to employee
  await query(`
    INSERT INTO notifications (
      user_id, title, message, type, read, tenant_id
    ) VALUES ($1, $2, $3, $4, false, $5)
  `, [
    leaveRequest.employee_id,
    newStatus === 'approved' ? 'Leave Request Approved' : 'Leave Request Denied',
    `Your leave request from ${leaveRequest.start_date} to ${leaveRequest.end_date} has been ${newStatus}.${admin_notes ? ' Note: ' + admin_notes : ''}`,
    newStatus === 'approved' ? 'success' : 'warning',
    tenantContext.tenant_id
  ])

  return NextResponse.json({ 
    success: true, 
    data: result.rows[0] 
  })
}
```

---

## 4. Shift Swaps API with Location Scoping

```typescript
// app/api/shift-swaps/route.ts

/**
 * GET /api/shift-swaps
 * - Admins: See all swap requests
 * - Managers: See only swaps within their location
 * - Agents: See only their own swaps (as requester or target)
 */
export async function GET(request: NextRequest) {
  // ... auth code ...

  const locationAccess = await getUserLocationAccess(
    user.id,
    user.role,
    tenantContext.tenant_id
  )

  let queryText = `
    SELECT 
      ss.*,
      req.first_name as requester_first_name,
      req.last_name as requester_last_name,
      req.location_id as requester_location_id,
      tgt.first_name as target_first_name,
      tgt.last_name as target_last_name,
      tgt.location_id as target_location_id,
      l.name as location_name
    FROM shift_swaps ss
    JOIN employees req ON ss.requester_id = req.id
    JOIN employees tgt ON ss.target_id = tgt.id
    LEFT JOIN locations l ON req.location_id = l.id
    WHERE ss.tenant_id = $1
  `
  const params: any[] = [tenantContext.tenant_id]
  let paramIndex = 2

  // AGENTS: Only their own swaps
  if (locationAccess.isAgent) {
    queryText += ` AND (ss.requester_id = $${paramIndex} OR ss.target_id = $${paramIndex})`
    params.push(user.id)
    paramIndex++
  }

  // MANAGERS: Only swaps within their location
  if (locationAccess.isManager && locationAccess.locationId) {
    queryText += ` AND req.location_id = $${paramIndex}`
    params.push(locationAccess.locationId)
    paramIndex++
  }

  queryText += ` ORDER BY ss.created_at DESC`

  const result = await query(queryText, params)
  return NextResponse.json({ success: true, data: result.rows })
}

/**
 * POST /api/shift-swaps/[id]/approve
 * - Managers can only approve swaps within their location
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // ... auth code ...

  if (user.role !== 'admin' && user.role !== 'manager') {
    return NextResponse.json({ 
      error: 'Only admins and managers can approve swap requests' 
    }, { status: 403 })
  }

  const locationAccess = await getUserLocationAccess(
    user.id,
    user.role,
    tenantContext.tenant_id
  )

  const swapId = params.id

  // Get swap with employee locations
  const swapResult = await query(`
    SELECT 
      ss.*,
      req.location_id as requester_location_id,
      tgt.location_id as target_location_id
    FROM shift_swaps ss
    JOIN employees req ON ss.requester_id = req.id
    JOIN employees tgt ON ss.target_id = tgt.id
    WHERE ss.id = $1 AND ss.tenant_id = $2
  `, [swapId, tenantContext.tenant_id])

  if (swapResult.rows.length === 0) {
    return NextResponse.json({ 
      error: 'Swap request not found' 
    }, { status: 404 })
  }

  const swap = swapResult.rows[0]

  // MANAGERS: Both employees must be in their location
  if (locationAccess.isManager) {
    if (swap.requester_location_id !== locationAccess.locationId ||
        swap.target_location_id !== locationAccess.locationId) {
      return NextResponse.json({ 
        error: 'You can only approve swaps within your location' 
      }, { status: 403 })
    }
  }

  // Approve the swap
  // ... update logic ...

  return NextResponse.json({ success: true })
}
```

---

## Quick Implementation Checklist

For each API you want to scope by location:

- [ ] Import location permission helpers
- [ ] Get user location access after authentication
- [ ] Add location filter to WHERE clause for managers
- [ ] Add agent-specific restrictions if needed
- [ ] Validate location permissions before updates/creates
- [ ] Test with admin, manager, and agent roles
- [ ] Verify cross-location data isolation

---

## Testing Commands

```bash
# Test as Manager
curl -X GET "http://localhost:3000/api/teams" \
  -H "Authorization: Bearer MANAGER_TOKEN"

# Should only return teams from manager's location

# Test as Agent
curl -X GET "http://localhost:3000/api/rotas" \
  -H "Authorization: Bearer AGENT_TOKEN"

# Should only return published rotas

# Test location isolation
curl -X PUT "http://localhost:3000/api/timesheets/OTHER_LOCATION_ENTRY" \
  -H "Authorization: Bearer MANAGER_TOKEN"

# Should return 403 Forbidden
```

---

These examples follow the same pattern used in the implemented Rotas API. Apply this pattern consistently across all APIs for proper location scoping! 🎯

