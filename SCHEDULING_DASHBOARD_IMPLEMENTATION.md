# RotaCloud Scheduling Dashboard Implementation Plan

## Overview
This document outlines the step-by-step implementation of a clean, simplified scheduling dashboard for the RotaCloud SaaS application. The goal is to replace the current complex scheduling system with a simple grid-based interface where employees are listed on the left, weekdays are columns, and admins can easily assign shifts by clicking plus buttons.

## Current State Analysis
- Database has duplicate shifts and complex scheduling logic
- Current admin scheduling interface is confusing and overcomplicated
- Multiple scheduling pages exist (admin, project-manager, team-lead)
- Need to consolidate into one clean interface

## Target State
- Simple grid layout: employees on left, weekdays as columns
- Search bar for filtering employees
- Plus buttons in each employee/day cell for shift assignment
- Clean, modern UI similar to reference images
- Real-time visibility for employees

## Implementation Steps

### Phase 1: Database Cleanup and Preparation
- [x] **Step 1.1**: Create database cleanup script to remove duplicate shifts
- [x] **Step 1.2**: Backup existing shift assignments data
- [x] **Step 1.3**: Flush hardcoded and dummy shifts from database
- [x] **Step 1.4**: Verify database schema is clean and optimized

### Phase 2: Core API Development
- [x] **Step 2.1**: Create simplified shift assignment API endpoints
- [x] **Step 2.2**: Create employee listing API with search functionality
- [x] **Step 2.3**: Create week-based scheduling data API
- [x] **Step 2.4**: Create shift template management API

### Phase 3: Frontend Components
- [x] **Step 3.1**: Create EmployeeList component with search
- [x] **Step 3.2**: Create WeekGrid component for day columns
- [x] **Step 3.3**: Create ShiftCell component with plus button
- [x] **Step 3.4**: Create ShiftAssignmentModal component
- [x] **Step 3.5**: Create ShiftTemplateModal component

### Phase 4: Main Scheduling Dashboard
- [x] **Step 4.1**: Create new simplified scheduling page
- [x] **Step 4.2**: Implement grid layout with employee list and week columns
- [x] **Step 4.3**: Add search functionality for employees
- [x] **Step 4.4**: Implement shift assignment workflow
- [x] **Step 4.5**: Add shift template management

### Phase 5: Employee View Integration
- [ ] **Step 5.1**: Update employee dashboard to show assigned shifts
- [ ] **Step 5.2**: Create employee shift calendar view
- [ ] **Step 5.3**: Add real-time shift notifications
- [ ] **Step 5.4**: Test employee shift visibility

### Phase 6: Testing and Polish
- [ ] **Step 6.1**: Unit tests for new components
- [ ] **Step 6.2**: Integration tests for API endpoints
- [ ] **Step 6.3**: End-to-end testing of scheduling workflow
- [ ] **Step 6.4**: Performance optimization
- [ ] **Step 6.5**: UI/UX polish and responsive design

### Phase 7: Migration and Deployment
- [ ] **Step 7.1**: Create migration script from old to new system
- [ ] **Step 7.2**: Update navigation to point to new scheduling page
- [ ] **Step 7.3**: Deprecate old scheduling pages
- [ ] **Step 7.4**: Deploy to staging environment
- [ ] **Step 7.5**: Production deployment

## Technical Specifications

### Database Schema (Simplified)
```sql
-- Core tables we'll use
employees (id, employee_id, first_name, last_name, email, department, is_active)
shifts (id, name, start_time, end_time, department, color, is_active)
shift_assignments (id, employee_id, shift_id, date, status, assigned_by)
```

### API Endpoints
- `GET /api/scheduling/employees` - Get employees with search
- `GET /api/scheduling/week/{date}` - Get week schedule data
- `POST /api/scheduling/assign` - Assign shift to employee
- `DELETE /api/scheduling/assign/{id}` - Remove shift assignment
- `GET /api/scheduling/templates` - Get shift templates
- `POST /api/scheduling/templates` - Create shift template

### Component Structure
```
SchedulingDashboard/
├── EmployeeList/
│   ├── SearchBar
│   └── EmployeeItem
├── WeekGrid/
│   ├── DayColumn
│   └── ShiftCell
├── Modals/
│   ├── ShiftAssignmentModal
│   └── ShiftTemplateModal
└── Controls/
    ├── WeekNavigation
    └── ShiftTemplates
```

## Success Criteria
- [ ] Clean, intuitive grid-based scheduling interface
- [ ] No duplicate shifts in database
- [ ] Fast employee search functionality
- [ ] Simple one-click shift assignment
- [ ] Real-time employee visibility
- [ ] Mobile-responsive design
- [ ] Performance under load (100+ employees, 7 days)

## Progress Tracking
- **Current Phase**: Phase 5 - Employee View Integration
- **Overall Progress**: 64% (18/28 steps completed)
- **Last Updated**: December 19, 2024

## Notes
- All passwords will be set to 'password123' as per user preference
- Using PostgreSQL on Railway exclusively (no Supabase)
- Focus on simplicity and usability over complex features
- Maintain existing authentication and authorization patterns
