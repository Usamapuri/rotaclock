


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
- **API Endpoints**: Complete REST API with proper authorization and scope enforcement
- **Frontend Components**: Tabbed interface with dialogs for request management
- **Unit Testing**: Comprehensive test suite for all new APIs

### 🔄 In Progress
- **Team Lead Meeting Notes**: Review and consolidate reports
- **Team Lead Broadcasting**: Send messages to team members
- **Team Lead Dock/Bonus Requests**: Create requests for admin approval
- **PM Dashboard**: Team reports and project updates

### ⏳ Pending
- **Real-time Updates**: WebSocket/SSE for live data
- **Performance Optimization**: Query optimization and caching
- **Integration Testing**: End-to-end testing with Playwright

## II. Recently Completed Features (Latest Implementation)

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

### API Testing
You can test the API endpoints directly:

```bash
# Test leave requests for David Wilson's team
curl -X GET "http://localhost:3000/api/team-lead/leave-requests" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04"

# Test swap requests for David Wilson's team
curl -X GET "http://localhost:3000/api/team-lead/shifts/swap-requests" \
  -H "Authorization: Bearer 555e2e86-36c9-4a86-a11d-83bc2af20b04"
```

## Next Steps Checklist

### Immediate Next Steps
- [ ] **A5 - Meeting Notes**: Create TL meeting notes review and report consolidation
- [ ] **A6 - Broadcasting**: Implement team message broadcasting functionality
- [ ] **A7 - Dock/Bonus Requests**: Create TL dock and bonus request system
- [ ] **PM Dashboard**: Implement PM team reports and project updates

### Technical Debt
- [ ] Add comprehensive error logging
- [ ] Implement request rate limiting
- [ ] Add API response caching
- [ ] Optimize database queries for large teams

### Documentation
- [ ] Create user guide for Team Leads
- [ ] Create user guide for Project Managers
- [ ] Update API documentation
- [ ] Create deployment guide

## Continuation Guide for New Chat Sessions

### Current Status
- **Last Completed**: Team Lead swap and leave request management
- **Current Phase**: Moving to Team Lead meeting notes and broadcasting features
- **Database**: Contains test data for all Team Lead functionality
- **Frontend**: Enhanced Team Lead dashboard with tabbed interface
- **Backend**: Complete API endpoints with proper authorization

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
1. Implement Team Lead meeting notes review system
2. Add team broadcasting functionality
3. Create dock/bonus request system
4. Build PM dashboard for team reports

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
*Status: Team Lead swap and leave request management completed*
