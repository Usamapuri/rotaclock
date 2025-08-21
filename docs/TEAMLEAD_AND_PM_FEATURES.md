


## Team Lead and Project Manager Feature Implementation Plan

## Overview
This document outlines the implementation plan for extending admin-level project and team management capabilities to Project Managers (PMs) and Team Leads (TLs) within the RotaCloud SaaS application, with strict scope limitations to their respective projects and teams.

## Current Implementation Status

### ✅ Completed Features


#### 1. Project Manager Features
- **Admin-equivalent UI**: Full CRUD operations for projects and teams
- **Scope Enforcement**: PMs can only manage their assigned projects and teams
- **Team Management**: Create, edit, assign teams to projects, transfer employees
- **API Endpoints**: Complete REST API with proper authorization
- **Frontend Components**: Enhanced UI with dialogs, forms, and real-time updates

#### 2. Team Lead Features - **RECENTLY COMPLETED**
- **Swap Request Management**: View, approve, deny swap requests with notes
- **Leave Request Management**: View, approve, reject leave requests with notes
- **Team Member Management**: View team members and their status
- **Meeting Notes Management**: Review and consolidate team reports with filtering and statistics
- **Dock/Bonus Request Management**: Create dock and bonus requests for admin approval with comprehensive filtering
- **API Endpoints**: Complete REST API with proper authorization and scope enforcement
- **Frontend Components**: Tabbed interface with dialogs for request management, report consolidation, and dock/bonus requests
- **Unit Testing**: Comprehensive test suite for all new APIs

#### 3. Project Manager Features - **RECENTLY COMPLETED**
- **Team Reports Dashboard**: View, review, and manage team reports from managed teams
- **Report Review System**: Approve, reject, or review team reports with PM notes
- **Advanced Filtering**: Filter reports by team, status, and date range
- **Summary Statistics**: Dashboard with comprehensive report statistics
- **API Endpoints**: Complete REST API with proper PM scope enforcement
- **Frontend Components**: Comprehensive dashboard with detailed report viewing and review dialogs
- **Scope Enforcement**: PMs can only access reports from their managed teams

### 🔄 In Progress
- **Team Lead Broadcasting**: Send messages to team members

### ✅ Recently Completed
- **Real-time Updates**: WebSocket/SSE for live data
- **Performance Optimization**: Query optimization, caching, rate limiting, and monitoring

### ⏳ Pending
- **Integration Testing**: End-to-end testing with Playwright

## II. Recently Completed Features (Latest Implementation)

### PM Dashboard Team Reports Management - **JUST COMPLETED**

#### Backend Implementation
- **New API Endpoints**:
  - `GET /api/project-manager/team-reports` - List team reports with filtering and PM scope enforcement
  - `GET /api/project-manager/team-reports/[id]` - Get specific team report details
  - `PATCH /api/project-manager/team-reports/[id]` - Review and update team reports

- **Authorization & Scope**:
  - All endpoints require `isProjectManager()` authentication
  - PMs can only access reports from teams they manage
  - Proper error handling and scope enforcement

- **Database Integration**:
  - Uses existing `team_reports` table created by Team Leads
  - Joins with `manager_projects` and `teams` for scope enforcement
  - Stores PM review information (status, notes, review timestamp)

#### Frontend Implementation
- **Dedicated Reports Page** (`app/project-manager/reports/page.tsx`):
  - Comprehensive dashboard with summary statistics
  - Advanced filtering by team, status, and date range
  - Interactive report viewing and review dialogs
  - Real-time data loading and error handling

- **UI Components**:
  - Summary cards showing total, pending, reviewed, approved, and rejected reports
  - Filter controls for team, status, and date range
  - Report table with detailed information and actions
  - View report dialog with comprehensive report details
  - Review dialog for updating report status and adding PM notes
  - Toast notifications for success/error feedback
  - Responsive design with proper accessibility

#### Key Features
1. **Scope Enforcement**: PMs can only access reports from their managed teams
2. **Advanced Filtering**: Filter by team, status, and date range
3. **Report Review System**: Approve, reject, or review reports with PM notes
4. **Statistics Dashboard**: Real-time summary of report statuses
5. **Detailed Report Viewing**: Comprehensive view of team reports with highlights, concerns, and recommendations
6. **Team Lead Integration**: Notifications sent to team leads when reports are reviewed

### Team Lead Dock/Bonus Request Management - **JUST COMPLETED**

#### Backend Implementation
- **New API Endpoints**:
  - `GET /api/team-lead/requests` - List dock and bonus requests with filtering
  - `POST /api/team-lead/requests` - Create new dock or bonus requests

- **Authorization & Scope**:
  - All endpoints require `isTeamLead()` authentication
  - Team Leads can only create requests for their team members
  - Proper error handling for unauthorized access

- **Database Integration**:
  - New `team_requests` table for storing dock and bonus requests
  - Joins with `employees` table to enforce team scope
  - Stores request details, amounts, reasons, and admin review information

#### Frontend Implementation
- **Dedicated Requests Page** (`app/team-lead/requests/page.tsx`):
  - Comprehensive dashboard with summary statistics
  - Advanced filtering by type, status, and employee
  - Interactive create request dialog with form validation
  - Detailed request view with admin review information
  - Real-time data loading and error handling

- **UI Components**:
  - Summary cards showing total, pending, approved, and rejected requests
  - Filter controls for request type, status, and employee search
  - Create request dialog with dynamic form fields
  - Request details dialog with comprehensive information
  - Toast notifications for success/error feedback
  - Responsive design with proper accessibility

#### Key Features
1. **Scope Enforcement**: Team Leads can only create requests for their team members
2. **Advanced Filtering**: Filter by request type (dock/bonus), status, and employee
3. **Form Validation**: Comprehensive validation for all request fields
4. **Statistics Dashboard**: Real-time summary of request statuses
5. **Admin Integration**: Requests are created for admin review and approval
6. **Error Handling**: Comprehensive error handling with user-friendly messages

### Real-time Updates - **JUST COMPLETED**

#### Backend Implementation
- **SSE Endpoints**:
  - `/api/team-lead/realtime` - Team Lead real-time updates (team members, requests, meeting notes, notifications)
  - `/api/project-manager/realtime` - PM real-time updates (team reports, managed teams, notifications, summary stats)
  - `/api/notifications/realtime` - General notifications real-time updates
  - Enhanced existing `/api/dashboard/events` and `/api/team-lead/events`

- **Real-time Features**:
  - Live team member status updates (online/offline/break)
  - Real-time dock/bonus request updates
  - Live meeting notes and team report updates
  - Instant notification delivery
  - Automatic reconnection with exponential backoff
  - Heartbeat mechanism for connection health

- **Performance Optimizations**:
  - Efficient SSE streaming with proper headers
  - Connection pooling and cleanup
  - Error handling and recovery
  - Rate limiting for SSE endpoints

#### Frontend Implementation
- **React Hooks**:
  - `useTeamLeadRealtime()` - Team Lead real-time data management
  - `usePMRealtime()` - Project Manager real-time data management
  - `useNotificationsRealtime()` - General notifications management
  - Enhanced existing `useDashboardEvents()` and `useTeamEvents()`

- **UI Components**:
  - `RealtimeStatus` component with visual connection indicators
  - Real-time status badges with tooltips
  - Connection health monitoring
  - Manual reconnection controls

- **Integration**:
  - Team Lead dashboard with live updates
  - PM reports dashboard with real-time data
  - Automatic data synchronization
  - Fallback to manual refresh when needed

#### Key Features
1. **Live Data Updates**: Real-time synchronization of all critical data
2. **Connection Management**: Automatic reconnection with smart retry logic
3. **Visual Feedback**: Clear connection status indicators
4. **Performance**: Efficient SSE implementation with minimal overhead
5. **Error Handling**: Comprehensive error handling and recovery
6. **Scalability**: Designed to handle multiple concurrent connections

### Performance Optimization - **JUST COMPLETED**

#### Backend Implementation
- **Caching System**:
  - LRU cache implementation with configurable TTL
  - Separate caches for users, teams, requests, and reports
  - Intelligent cache invalidation on data updates
  - Cache hit rate monitoring and optimization

- **Rate Limiting**:
  - Token-based rate limiting with configurable limits
  - Different limits for different user roles (Team Lead, PM, Admin)
  - Rate limit headers in API responses
  - Protection against API abuse and DoS attacks

- **Database Optimization**:
  - Enhanced connection pool configuration
  - Prepared statements for better query performance
  - Query timeout and statement timeout protection
  - Slow query logging and monitoring
  - Optimized query functions with performance tracking

- **Performance Monitoring**:
  - Real-time API response time tracking
  - Database query performance monitoring
  - Cache operation performance tracking
  - Admin dashboard for performance metrics
  - Slow request detection and alerting

#### Key Features
1. **Caching**: 3-5 minute cache TTL for frequently accessed data
2. **Rate Limiting**: 30 requests/minute for GET, 10 requests/minute for POST
3. **Query Optimization**: Prepared statements and connection pooling
4. **Monitoring**: Real-time performance metrics and alerting
5. **Cache Invalidation**: Automatic cache clearing on data updates

### Team Lead Meeting Notes Management - **JUST COMPLETED**

#### Backend Implementation
- **New API Endpoints**:
  - `GET /api/team-lead/meeting-notes` - List meeting notes for team members with filtering
  - `POST /api/team-lead/meeting-notes/consolidate` - Create consolidated team reports

- **Authorization & Scope**:
  - All endpoints require `isTeamLead()` authentication
  - Team Leads can only access notes from their team members
  - Proper error handling for unauthorized access

- **Database Integration**:
  - Uses existing `shift_logs` table for meeting notes data
  - New `team_reports` table for consolidated reports
  - Joins with `employees` table to enforce team scope
  - Stores JSON data for highlights, concerns, and recommendations

#### Frontend Implementation
- **Enhanced Team Lead Dashboard** (`app/team-lead/team/page.tsx`):
  - New "Meeting Notes" tab with comprehensive filtering
  - Real-time data loading with proper error handling
  - Interactive consolidate dialog with form validation
  - Statistics display and report generation
  - Date range selection and employee filtering

- **UI Components**:
  - Meeting notes table with performance metrics
  - Consolidate report dialog with dynamic form fields
  - Filter controls for employee, date range, and remarks
  - Toast notifications for success/error feedback
  - Responsive design with proper accessibility

#### Key Features
1. **Scope Enforcement**: Team Leads can only access notes from their team members
2. **Advanced Filtering**: Filter by employee, date range, and presence of remarks
3. **Report Consolidation**: Create comprehensive team reports with statistics
4. **Statistics Calculation**: Automatic calculation of team performance metrics
5. **Real-time Updates**: UI updates immediately after report creation
6. **Error Handling**: Comprehensive error handling with user-friendly messages

### Team Lead Swap and Leave Request Management

#### Backend Implementation
- **New API Endpoints**:
  - `GET /api/team-lead/shifts/swap-requests` - List swap requests for team members
  - `GET /api/team-lead/shifts/swap-requests/[id]` - Get specific swap request details
  - `PATCH /api/team-lead/shifts/swap-requests/[id]` - Approve/deny swap requests
  - `GET /api/team-lead/leave-requests` - List leave requests for team members
  - `GET /api/team-lead/leave-requests/[id]` - Get specific leave request details
  - `PATCH /api/team-lead/leave-requests/[id]` - Approve/reject leave requests

- **Authorization & Scope**:
  - All endpoints require `isTeamLead()` authentication
  - Team Leads can only access requests involving their team members
  - Proper error handling for unauthorized access

- **Database Integration**:
  - Uses existing `shift_swaps` and `leave_requests` tables
  - Joins with `employees` table to enforce team scope
  - Updates `admin_notes` field for Team Lead comments

#### Frontend Implementation
- **Enhanced Team Lead Dashboard** (`app/team-lead/team/page.tsx`):
  - Tabbed interface: Members, Swap Requests, Leave Requests, All Requests
  - Real-time data loading with proper error handling
  - Interactive dialogs for reviewing and acting on requests
  - Status badges and filtering for pending requests
  - Notes functionality for request decisions

- **UI Components**:
  - Request review dialogs with detailed information
  - Approve/Deny/Reject buttons with loading states
  - Toast notifications for success/error feedback
  - Responsive design with proper accessibility

#### Testing Implementation
- **Unit Tests**:
  - `__tests__/api/team-lead/swap-requests.test.ts` - Comprehensive API testing
  - `__tests__/api/team-lead/leave-requests.test.ts` - Leave request API testing
  - Mocked database and authentication for isolated testing
  - Coverage for authorization, validation, and business logic

- **Test Setup**:
  - Jest configuration with proper module mapping
  - Global mocks for Next.js Request/Response objects
  - Test database setup script for consistent test data

#### Key Features
1. **Scope Enforcement**: Team Leads can only manage requests for their team members
2. **Request Management**: Full CRUD operations with proper status tracking
3. **Notes System**: Team Leads can add notes when approving/denying requests
4. **Real-time Updates**: UI updates immediately after request actions
5. **Error Handling**: Comprehensive error handling with user-friendly messages

## Testing Instructions

### Prerequisites
1. Development server running: `npm run dev`
2. Database connected with test data
3. Team Lead users available in the system

### Test Data Available
The system now includes test data for Team Lead functionality:

**Team Lead Users**:
- **David Wilson** (`david.wilson@rotacloud.com`) - Team Lead for "Customer Support Team A"
- **Lewis Hamilton** (`l@rotacloud.com`) - Team Lead for "Sex Team"

**Test Leave Requests**:
- 3 pending leave requests for "Customer Support Team A" members
- 1 pending leave request for "Sales Team A" member

### Testing Steps

#### 1. Test Team Lead Login
1. Navigate to `/team-lead/login`
2. Login with David Wilson credentials
3. Verify redirect to team management dashboard

#### 2. Test Leave Request Management
1. Navigate to "Leave Requests" tab
2. Verify 3 pending requests are displayed
3. Click "Review" on a request
4. Add notes and approve/reject the request
5. Verify status updates and toast notifications

#### 3. Test Swap Request Management
1. Navigate to "Swap Requests" tab
2. Verify no pending requests (since we didn't create swap requests due to shift assignment requirements)
3. The functionality is ready for when swap requests are created

#### 4. Test Team Member View
1. Navigate to "Members" tab
2. Verify team members are displayed correctly
3. Test search functionality
4. Test CSV export

#### 5. Test Meeting Notes Management
1. Navigate to "Meeting Notes" tab
2. Verify meeting notes are displayed with performance metrics
3. Test filtering by employee, date range, and remarks
4. Click "Consolidate Report" button
5. Fill in the consolidate form with summary, highlights, concerns, and recommendations
6. Submit the report and verify success notification
7. Test date range filtering in the consolidate dialog

#### 6. Test Dock/Bonus Request Management
1. Navigate to `/team-lead/requests` or click "Dock & Bonus Requests" button
2. Verify the dashboard shows summary statistics
3. Test filtering by request type, status, and employee
4. Click "Create Request" button
5. Fill in the form with request type, employee, amount, reason, and effective date
6. Submit the request and verify success notification
7. View request details by clicking the eye icon
8. Test creating both bonus and dock requests

#### 7. Test PM Team Reports Dashboard
1. Navigate to `/project-manager/reports` in PM dashboard
2. Verify summary statistics are displayed (total, pending, reviewed, approved, rejected)
3. Test filtering by team, status, and date range
4. Click "View" button on a report to see detailed information
5. Test the review dialog by clicking "Review" button
6. Update report status and add PM notes
7. Submit review and verify success notification
8. Verify report status updates in the table

### API Testing
You can test the API endpoints directly:

```bash
# Test leave requests for David Wilson's team
curl -X GET "http://localhost:3000/api/team-lead/leave-requests" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04"

# Test swap requests for David Wilson's team
curl -X GET "http://localhost:3000/api/team-lead/shifts/swap-requests" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04"

# Test meeting notes for David Wilson's team
curl -X GET "http://localhost:3000/api/team-lead/meeting-notes" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04"

# Test meeting notes with filtering
curl -X GET "http://localhost:3000/api/team-lead/meeting-notes?has_remarks=true&date_from=2025-08-18&date_to=2025-08-20" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04"

# Test consolidate report
curl -X POST "http://localhost:3000/api/team-lead/meeting-notes/consolidate" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04" \
  -H "Content-Type: application/json" \
  -d '{
    "date_from": "2025-08-14",
    "date_to": "2025-08-20",
    "summary": "Weekly team performance review",
    "highlights": ["Team performed well"],
    "concerns": ["Need improvement"],
    "recommendations": ["Schedule training"],
    "send_to_pm": false
  }'

# Test dock/bonus requests for David Wilson's team
curl -X GET "http://localhost:3000/api/team-lead/requests" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04"

# Test dock/bonus requests with filtering
curl -X GET "http://localhost:3000/api/team-lead/requests?type=bonus&status=pending" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04"

# Test create bonus request
curl -X POST "http://localhost:3000/api/team-lead/requests" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bonus",
    "employee_id": "ada13910-097d-429e-97d1-de4d0208d207",
    "amount": 100.00,
    "reason": "Excellent performance during the week",
    "effective_date": "2024-12-25",
    "additional_notes": "Recognizes outstanding dedication"
  }'

# Test PM team reports
curl -X GET "http://localhost:3000/api/project-manager/team-reports" \
  -H "Authorization: Bearer 12f6bf80-f090-459a-93c3-c9fe71b54a82"

# Test PM team reports with filtering
curl -X GET "http://localhost:3000/api/project-manager/team-reports?status=pending" \
  -H "Authorization: Bearer 12f6bf80-f090-459a-93c3-c9fe71b54a82"

# Test PM review team report
curl -X PATCH "http://localhost:3000/api/project-manager/team-reports/[REPORT_ID]" \
  -H "Authorization: Bearer 12f6bf80-f090-459a-93c3-c9fe71b54a82" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "pm_notes": "Excellent report with clear insights and actionable recommendations"
  }'

#### 8. Test Real-time Updates

# Test Team Lead real-time endpoint
curl -X GET "http://localhost:3000/api/team-lead/realtime?teamId=[TEAM_ID]" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04" \
  -H "Accept: text/event-stream"

# Test PM real-time endpoint
curl -X GET "http://localhost:3000/api/project-manager/realtime" \
  -H "Authorization: Bearer 12f6bf80-f090-459a-93c3-c9fe71b54a82" \
  -H "Accept: text/event-stream"

# Test notifications real-time endpoint
curl -X GET "http://localhost:3000/api/notifications/realtime" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04" \
  -H "Accept: text/event-stream"

# Run comprehensive real-time tests
node scripts/test-realtime-updates.js
```

## Next Steps Checklist

### Immediate Next Steps
- [x] **A5 - Meeting Notes**: Create TL meeting notes review and report consolidation ✅ **COMPLETED**
- [x] **A7 - Dock/Bonus Requests**: Create TL dock and bonus request system ✅ **COMPLETED**
- [x] **PM Dashboard**: Implement PM team reports and project updates ✅ **COMPLETED**
- [ ] **A6 - Broadcasting**: Implement team message broadcasting functionality

### Technical Debt
- [x] Add comprehensive error logging ✅ **COMPLETED**
- [x] Implement request rate limiting ✅ **COMPLETED**
- [x] Add API response caching ✅ **COMPLETED**
- [x] Optimize database queries for large teams ✅ **COMPLETED**

### Documentation
- [ ] Create user guide for Team Leads
- [ ] Create user guide for Project Managers
- [ ] Update API documentation
- [ ] Create deployment guide

## Continuation Guide for New Chat Sessions

### Current Status
- **Last Completed**: Real-time Updates implementation with SSE endpoints and frontend integration
- **Current Phase**: Moving to team broadcasting features and integration testing
- **Database**: Contains test data for all Team Lead and PM functionality including team reports and dock/bonus requests
- **Frontend**: Enhanced Team Lead dashboard with real-time updates, dedicated requests page, and comprehensive PM reports dashboard with live data
- **Backend**: Complete API endpoints with proper authorization including team reports, meeting notes, dock/bonus request APIs, and real-time SSE endpoints

### Setup Commands
```bash
# Start development server
npm run dev

# Run tests
npm test

# Create test data (if needed)
node scripts/create-simple-test-requests.js

# Check current data
node scripts/check-requests.js
```

### Key Files
- **Frontend**: `app/team-lead/team/page.tsx` - Main Team Lead dashboard
- **APIs**: 
  - `app/api/team-lead/shifts/swap-requests/route.ts`
  - `app/api/team-lead/leave-requests/route.ts`
- **Tests**: `__tests__/api/team-lead/` - Unit tests for Team Lead APIs
- **Database**: `lib/database.ts` - Database helper functions

### Next Steps
1. Add team broadcasting functionality
2. Implement admin review interface for dock/bonus requests
3. Add comprehensive error logging and monitoring
4. Complete integration testing with Playwright

### Common Issues & Solutions
- **"Failed to load swap requests"**: Fixed by adding Authorization headers to frontend requests
- **No team members**: Ensure employees are assigned to teams via `team_assignments` table
- **Authentication errors**: Verify team lead user exists and has proper role

### Development Workflow
1. Create feature branch
2. Implement backend API with tests
3. Implement frontend components
4. Add unit tests
5. Test with real data
6. Update documentation
7. Merge to main

---

*Last Updated: August 20, 2025*
*Status: Real-time Updates implementation completed with SSE endpoints and frontend integration*
