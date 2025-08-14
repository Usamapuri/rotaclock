# Team Lead Feature Implementation Guide

## Overview
This document outlines the step-by-step implementation of Team Lead features for the RotaCloud employee management system. Each step is designed to be a small, achievable milestone that can be completed independently.

## Phase 0: Admin Team Lead Management (NEW)
### 0.1 Admin Team Management Interface
- [ ] Create `app/admin/teams/page.tsx` - Admin teams overview page
- [ ] Create `app/admin/teams/new/page.tsx` - Create new team page
- [ ] Create `app/admin/teams/[id]/page.tsx` - Edit team page
- [ ] Create `app/admin/teams/[id]/members/page.tsx` - Manage team members page

### 0.2 Admin Team Lead Management
- [ ] Create `app/admin/team-leads/page.tsx` - All team leads overview
- [ ] Create `app/admin/team-leads/new/page.tsx` - Assign team lead role
- [ ] Create `app/admin/team-leads/[id]/page.tsx` - Team lead details and performance
- [ ] Add team lead role assignment in employee creation/edit forms

### 0.3 Admin Team Monitoring
- [ ] Create `app/admin/teams/[id]/performance/page.tsx` - Team performance monitoring
- [ ] Create `app/admin/teams/[id]/reports/page.tsx` - Team reports and analytics
- [ ] Create `app/admin/teams/[id]/quality/page.tsx` - Team quality monitoring
- [ ] Add team performance widgets to admin dashboard

### 0.4 Admin Team Lead Components
- [ ] Create `components/ui/admin/team-management.tsx` - Team CRUD interface
- [ ] Create `components/ui/admin/team-lead-assignment.tsx` - Team lead assignment form
- [ ] Create `components/ui/admin/team-performance-monitor.tsx` - Team performance dashboard
- [ ] Create `components/ui/admin/team-reports.tsx` - Team reporting interface

### 0.5 Admin Team Lead APIs
- [ ] Create `app/api/admin/teams/route.ts` - Admin team management
- [ ] Create `app/api/admin/team-leads/route.ts` - Admin team lead management
- [ ] Create `app/api/admin/teams/[id]/assign-lead/route.ts` - Assign team lead
- [ ] Create `app/api/admin/teams/[id]/performance/route.ts` - Team performance data

### 0.6 Admin Navigation Updates
- [ ] Add "Teams" section to admin sidebar
- [ ] Add "Team Leads" section to admin sidebar
- [ ] Update admin dashboard with team overview widgets
- [ ] Add team management breadcrumbs

## Phase 1: Database Schema Foundation
### 1.1 Update Employees Table
- [ ] Add `role` column to employees table
  ```sql
  ALTER TABLE employees ADD COLUMN role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'team_lead', 'employee'));
  ```
- [ ] Add `team_id` column to employees table
  ```sql
  ALTER TABLE employees ADD COLUMN team_id UUID;
  ```
- [ ] Create migration script: `scripts/add-team-lead-role.sql`

### 1.2 Create Teams Table
- [ ] Create teams table schema
  ```sql
  CREATE TABLE teams (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      department VARCHAR(100),
      team_lead_id UUID REFERENCES employees(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```
- [ ] Create migration script: `scripts/create-teams-table.sql`

### 1.3 Create Team Assignments Table
- [ ] Create team_assignments table
  ```sql
  CREATE TABLE team_assignments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_id UUID REFERENCES employees(id),
      team_id UUID REFERENCES teams(id),
      assigned_date DATE NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```
- [ ] Create migration script: `scripts/create-team-assignments.sql`

### 1.4 Create Performance Metrics Table
- [ ] Create performance_metrics table
  ```sql
  CREATE TABLE performance_metrics (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_id UUID REFERENCES employees(id),
      date DATE NOT NULL,
      calls_handled INTEGER DEFAULT 0,
      avg_handle_time INTEGER DEFAULT 0,
      customer_satisfaction DECIMAL(3,2),
      first_call_resolution_rate DECIMAL(5,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```
- [ ] Create migration script: `scripts/create-performance-metrics.sql`

### 1.5 Create Quality Scores Table
- [ ] Create quality_scores table
  ```sql
  CREATE TABLE quality_scores (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_id UUID REFERENCES employees(id),
      evaluator_id UUID REFERENCES employees(id),
      call_id VARCHAR(100),
      score DECIMAL(3,2),
      feedback TEXT,
      evaluation_date DATE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```
- [ ] Create migration script: `scripts/create-quality-scores.sql`

### 1.6 Add Database Indexes
- [ ] Add indexes for performance
  ```sql
  CREATE INDEX idx_employees_role ON employees(role);
  CREATE INDEX idx_employees_team_id ON employees(team_id);
  CREATE INDEX idx_team_assignments_employee_id ON team_assignments(employee_id);
  CREATE INDEX idx_team_assignments_team_id ON team_assignments(team_id);
  CREATE INDEX idx_performance_metrics_employee_date ON performance_metrics(employee_id, date);
  CREATE INDEX idx_quality_scores_employee_id ON quality_scores(employee_id);
  ```

## Phase 2: Authentication & Authorization
### 2.1 Update Auth Interface
- [ ] Update `AuthUser` interface in `lib/auth.ts`
  ```typescript
  export interface AuthUser {
    id: string
    email: string
    role: 'admin' | 'team_lead' | 'employee'
    employeeId?: string
    teamId?: string
  }
  ```

### 2.2 Add Team Lead Login Method
- [ ] Add `teamLeadLogin` method to `AuthService` class
- [ ] Add `isTeamLead` method to `AuthService` class
- [ ] Update `getCurrentUser` to handle team lead role

### 2.3 Update Database Auth Functions
- [ ] Add `isTeamLead()` function to `lib/database.ts`
- [ ] Add `getTeamMembers(teamLeadId: string)` function
- [ ] Add `canManageEmployee(teamLeadId: string, employeeId: string)` function
- [ ] Update `getCurrentEmployee()` to include team information

### 2.4 Create Team Lead Login API
- [ ] Create `app/api/auth/team-lead-login/route.ts`
- [ ] Implement team lead authentication logic
- [ ] Add proper error handling and validation

## Phase 3: API Endpoints
### 3.1 Team Management APIs
- [ ] Create `app/api/teams/route.ts` (GET, POST)
- [ ] Create `app/api/teams/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Create `app/api/teams/[id]/members/route.ts` (GET)
- [ ] Create `app/api/teams/[id]/performance/route.ts` (GET)

### 3.2 Team Member Management APIs
- [ ] Create `app/api/teams/[id]/attendance/route.ts` (GET)
- [ ] Create `app/api/teams/[id]/leave-approval/route.ts` (POST)
- [ ] Create `app/api/teams/[id]/performance-reviews/route.ts` (GET, POST)

### 3.3 Quality Assurance APIs
- [ ] Create `app/api/quality-scores/route.ts` (GET, POST)
- [ ] Create `app/api/teams/[id]/call-monitoring/route.ts` (GET)
- [ ] Create `app/api/teams/[id]/training-assignments/route.ts` (GET, POST)

### 3.4 Real-time Monitoring APIs
- [ ] Create `app/api/teams/[id]/live-status/route.ts` (GET)
- [ ] Create `app/api/teams/[id]/queue-status/route.ts` (GET)
- [ ] Create `app/api/teams/[id]/escalations/route.ts` (POST)

### 3.5 Performance Metrics APIs
- [ ] Create `app/api/performance-metrics/route.ts` (GET, POST)
- [ ] Create `app/api/performance-metrics/[employeeId]/route.ts` (GET, PUT)
- [ ] Create `app/api/performance-metrics/team/[teamId]/route.ts` (GET)

## Phase 4: UI Components
### 4.1 Team Dashboard Components
- [ ] Create `components/ui/team-overview.tsx`
- [ ] Create `components/ui/team-performance.tsx`
- [ ] Create `components/ui/team-calendar.tsx`
- [ ] Create `components/ui/team-chat.tsx`

### 4.2 Management Components
- [ ] Create `components/ui/team-member-management.tsx`
- [ ] Create `components/ui/performance-reviews.tsx`
- [ ] Create `components/ui/quality-monitoring.tsx`
- [ ] Create `components/ui/training-management.tsx`

### 4.3 Monitoring Components
- [ ] Create `components/ui/live-team-status.tsx`
- [ ] Create `components/ui/queue-monitor.tsx`
- [ ] Create `components/ui/escalation-handler.tsx`
- [ ] Create `components/ui/performance-metrics-chart.tsx`

### 4.4 Form Components
- [ ] Create `components/ui/team-lead-login-form.tsx`
- [ ] Create `components/ui/performance-review-form.tsx`
- [ ] Create `components/ui/quality-score-form.tsx`
- [ ] Create `components/ui/training-assignment-form.tsx`

## Phase 5: Team Lead Pages
### 5.1 Authentication Pages
- [ ] Create `app/team-lead/login/page.tsx`
- [ ] Add team lead login route to navigation

### 5.2 Dashboard Pages
- [ ] Create `app/team-lead/dashboard/page.tsx`
- [ ] Create `app/team-lead/team-members/page.tsx`
- [ ] Create `app/team-lead/scheduling/page.tsx`
- [ ] Create `app/team-lead/performance/page.tsx`

### 5.3 Management Pages
- [ ] Create `app/team-lead/quality/page.tsx`
- [ ] Create `app/team-lead/training/page.tsx`
- [ ] Create `app/team-lead/communications/page.tsx`
- [ ] Create `app/team-lead/reports/page.tsx`

### 5.4 Detail Pages
- [ ] Create `app/team-lead/team-members/[id]/page.tsx`
- [ ] Create `app/team-lead/performance/[id]/page.tsx`
- [ ] Create `app/team-lead/quality/[id]/page.tsx`

## Phase 6: Navigation & Layout
### 6.1 Team Lead Layout
- [ ] Create `app/team-lead/layout.tsx`
- [ ] Add team lead sidebar navigation
- [ ] Include team lead specific header

### 6.2 Navigation Updates
- [ ] Update main navigation to include team lead routes
- [ ] Add role-based navigation filtering
- [ ] Create team lead specific breadcrumbs

### 6.3 Sidebar Component
- [ ] Create `components/ui/team-lead-sidebar.tsx`
- [ ] Add team lead specific menu items
- [ ] Include team status indicators

## Phase 7: Data Models & Types
### 7.1 TypeScript Interfaces
- [ ] Create `types/team.ts`
  ```typescript
  interface Team {
    id: string
    name: string
    department: string
    teamLeadId: string
    members: Employee[]
  }
  ```
- [ ] Create `types/performance.ts`
- [ ] Create `types/quality.ts`
- [ ] Create `types/training.ts`

### 7.2 API Service Functions
- [ ] Add team management functions to `lib/api-service.ts`
- [ ] Add performance metrics functions
- [ ] Add quality assurance functions
- [ ] Add training management functions

## Phase 8: Real-time Features
### 8.1 WebSocket Setup
- [ ] Create WebSocket connection for team monitoring
- [ ] Implement real-time team status updates
- [ ] Add live performance metrics streaming

### 8.2 Event System
- [ ] Create team event handlers
- [ ] Implement team notification system
- [ ] Add escalation event handling

### 8.3 Live Monitoring
- [ ] Create live team status dashboard
- [ ] Implement queue monitoring
- [ ] Add real-time performance alerts

## Phase 9: Reporting & Analytics
### 9.1 Team Reports
- [ ] Create team performance reports
- [ ] Implement team attendance analytics
- [ ] Add team productivity metrics

### 9.2 Individual Reports
- [ ] Create individual performance reports
- [ ] Implement training completion reports
- [ ] Add quality score analytics

### 9.3 Export Features
- [ ] Add PDF export for reports
- [ ] Implement CSV export for data
- [ ] Create report scheduling

## Phase 10: Testing & Validation
### 10.1 Unit Tests
- [ ] Test team lead authentication
- [ ] Test team management functions
- [ ] Test performance metrics calculations
- [ ] Test quality score validation

### 10.2 Integration Tests
- [ ] Test team lead API endpoints
- [ ] Test team member management flows
- [ ] Test performance review process
- [ ] Test quality monitoring system

### 10.3 E2E Tests
- [ ] Test team lead login flow
- [ ] Test team dashboard functionality
- [ ] Test performance review workflow
- [ ] Test quality assurance process

## Phase 11: Documentation & Deployment
### 11.1 API Documentation
- [ ] Document all team lead API endpoints
- [ ] Create API usage examples
- [ ] Add error handling documentation

### 11.2 User Documentation
- [ ] Create team lead user guide
- [ ] Document team management procedures
- [ ] Create troubleshooting guide

### 11.3 Deployment
- [ ] Update database migration scripts
- [ ] Test deployment process
- [ ] Create rollback procedures

## Phase 12: Performance & Optimization
### 12.1 Database Optimization
- [ ] Optimize team queries
- [ ] Add database caching
- [ ] Implement query optimization

### 12.2 Frontend Optimization
- [ ] Optimize team dashboard loading
- [ ] Implement lazy loading for components
- [ ] Add performance monitoring

### 12.3 Caching Strategy
- [ ] Implement API response caching
- [ ] Add client-side caching
- [ ] Create cache invalidation strategy

## Progress Tracking
Use this checklist to track your progress:

### Completed Phases:
- [ ] Phase 0: Admin Team Lead Management (NEW)
- [ ] Phase 1: Database Schema Foundation
- [ ] Phase 2: Authentication & Authorization
- [ ] Phase 3: API Endpoints
- [ ] Phase 4: UI Components
- [ ] Phase 5: Team Lead Pages
- [ ] Phase 6: Navigation & Layout
- [ ] Phase 7: Data Models & Types
- [ ] Phase 8: Real-time Features
- [ ] Phase 9: Reporting & Analytics
- [ ] Phase 10: Testing & Validation
- [ ] Phase 11: Documentation & Deployment
- [ ] Phase 12: Performance & Optimization

### Current Status:
- **Current Phase:** Phase 0
- **Current Step:** 0.1 Admin Team Management Interface
- **Last Completed:** None

### Notes:
- Each step should be completed and tested before moving to the next
- If you encounter issues, document them here before moving on
- Commit your changes after completing each major step
- Test thoroughly before proceeding to the next phase

## Quick Reference Commands
```bash
# Run database migrations
npm run db:migrate

# Test API endpoints
npm run test:api

# Build and test
npm run build
npm run test

# Start development server
npm run dev
```

## Emergency Contacts
- Database Issues: Check `lib/database.ts`
- Auth Issues: Check `lib/auth.ts`
- API Issues: Check `app/api/` directory
- UI Issues: Check `components/ui/` directory