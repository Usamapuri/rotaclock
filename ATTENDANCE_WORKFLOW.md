







# Attendance Workflow System

This document describes the new attendance marking system for the cab call centre application.

## Overview

The new attendance workflow provides a seamless experience for employees to clock in and out with verification and detailed shift reporting.

## Workflow Steps

### 1. Employee Clock-In Process

1. **Employee Login**: Employee logs into the employee dashboard
2. **Start Shift**: Employee clicks "Start Shift with Verification"
3. **Photo Verification**: Employee takes a photo for identity verification
4. **Automatic Clock-In**: Upon successful verification:
   - Employee is automatically clocked in
   - A shift log is created in the database
   - Employee's online status is set to `true`
   - Timesheet is updated with clock-in time
5. **Dashboard Update**: Employee dashboard shows active shift with live timer

### 2. Employee Clock-Out Process

1. **End Shift**: Employee clicks "Clock Out" button
2. **Shift Remarks Dialog**: A comprehensive dialog opens with:
   - **Shift Summary**: Total duration and start time
   - **Performance Metrics**: 
     - Total calls taken
     - Leads generated
   - **Self Performance Rating**: 1-5 star rating
   - **Shift Remarks**: Text area for detailed notes
3. **Submit & Clock Out**: Employee fills in details and submits
4. **Database Update**: 
   - Shift log is completed with all remarks
   - Employee's online status is set to `false`
   - All data is saved to the database

### 3. Admin/Team Lead Visibility

- **Online Employees**: Real-time view of all online employees
- **Live Status**: Shows employee status, shift duration, and break time
- **Performance Data**: Access to shift remarks and performance metrics
- **Auto-refresh**: Dashboard updates every 30 seconds

## Database Changes

### New Fields Added

#### Employees Table
- `is_online` (BOOLEAN): Indicates if employee is currently online
- `last_online` (TIMESTAMP): When employee was last online

#### Shift Logs Table
- `total_calls_taken` (INTEGER): Number of calls handled during shift
- `leads_generated` (INTEGER): Number of leads generated during shift
- `shift_remarks` (TEXT): Employee's notes about the shift
- `performance_rating` (INTEGER): Self-rated performance (1-5)

### Migration Scripts

Run the following scripts to update your database:

```bash
# Run database migrations
node scripts/run-migrations.js

# Test the new workflow
node scripts/test-new-workflow.js
```

## API Endpoints

### Verification & Clock-In
- `POST /api/verification/save-photo`
  - Saves verification photo
  - Automatically clocks in employee
  - Updates online status

### Clock-Out with Remarks
- `POST /api/time/clock-out`
  - Accepts shift remarks and performance data
  - Completes shift log
  - Updates online status to offline

### Online Employees
- `GET /api/employees/online`
  - Returns all currently online employees
  - Includes shift information and duration

## Components

### New UI Components

1. **ShiftRemarksDialog** (`components/ui/shift-remarks-dialog.tsx`)
   - Comprehensive dialog for shift details
   - Performance metrics input
   - Self-rating system

2. **OnlineEmployees** (`components/ui/online-employees.tsx`)
   - Real-time display of online employees
   - Auto-refresh functionality
   - Status indicators and timers

### Updated Components

1. **Employee Dashboard** (`app/employee/dashboard/page.tsx`)
   - Integrated verification workflow
   - Shift remarks dialog integration
   - Real-time status updates

## Features

### For Employees
- ✅ One-click verification and clock-in
- ✅ Detailed shift reporting
- ✅ Performance self-assessment
- ✅ Real-time shift timer
- ✅ Break management

### For Admins/Team Leads
- ✅ Real-time online employee monitoring
- ✅ Shift performance tracking
- ✅ Detailed shift reports
- ✅ Live status updates

### Technical Features
- ✅ Automatic database updates
- ✅ Real-time status synchronization
- ✅ Comprehensive error handling
- ✅ Performance optimization with indexes

## Usage Instructions

### For Employees

1. **Starting a Shift**:
   - Login to employee dashboard
   - Click "Start Shift with Verification"
   - Take photo when prompted
   - You're automatically clocked in

2. **During Shift**:
   - Monitor your shift timer
   - Take breaks as needed
   - Track your performance

3. **Ending a Shift**:
   - Click "Clock Out"
   - Fill in shift details:
     - Number of calls taken
     - Leads generated
     - Performance rating
     - Shift remarks
   - Submit to complete shift

### For Admins/Team Leads

1. **Monitor Online Employees**:
   - View real-time online status
   - See shift durations and break times
   - Monitor performance metrics

2. **Access Reports**:
   - Shift completion reports
   - Performance analytics
   - Attendance summaries

## Testing

Run the test script to verify all functionality:

```bash
node scripts/test-new-workflow.js
```

This will test:
- ✅ Verification and automatic clock-in
- ✅ Clock-out with shift remarks
- ✅ Online status tracking
- ✅ API functionality

## Troubleshooting

### Common Issues

1. **Verification Fails**:
   - Check camera permissions
   - Ensure good lighting
   - Try again

2. **Clock-Out Issues**:
   - Ensure you have an active shift
   - Check all required fields are filled
   - Verify network connection

3. **Online Status Not Updating**:
   - Refresh the page
   - Check database connection
   - Verify migration scripts ran successfully

### Database Issues

If you encounter database errors:

1. Run migrations: `node scripts/run-migrations.js`
2. Check database connection
3. Verify all required tables exist
4. Check for any constraint violations

## Future Enhancements

Potential improvements for the system:

- [ ] GPS location tracking
- [ ] Biometric verification
- [ ] Advanced performance analytics
- [ ] Team performance comparisons
- [ ] Automated shift scheduling
- [ ] Mobile app integration

## Support

For technical support or questions about the attendance workflow:

1. Check this documentation
2. Run the test scripts
3. Review the database migrations
4. Check the console logs for errors

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Compatibility**: PostgreSQL, Next.js 14+
