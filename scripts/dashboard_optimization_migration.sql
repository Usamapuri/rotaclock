-- Dashboard Optimization Migration
-- Purpose: Add materialized views and indexes for dashboard queries
-- Notes: This will create materialized views that can be refreshed periodically

BEGIN;

-- Create materialized view for employee stats
CREATE MATERIALIZED VIEW IF NOT EXISTS employee_stats AS
SELECT 
  tenant_id,
  COUNT(*) as total_employees,
  COUNT(*) FILTER (WHERE is_active = true) as active_employees,
  COUNT(DISTINCT department) as total_departments
FROM employees
GROUP BY tenant_id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_stats_tenant ON employee_stats(tenant_id);

-- Create materialized view for shift stats
CREATE MATERIALIZED VIEW IF NOT EXISTS shift_stats AS
SELECT 
  tenant_id,
  date_trunc('day', date) as shift_date,
  COUNT(*) as total_shifts,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_shifts
FROM shift_assignments
GROUP BY tenant_id, date_trunc('day', date);

CREATE UNIQUE INDEX IF NOT EXISTS ux_shift_stats_tenant_date ON shift_stats(tenant_id, shift_date);

-- Create materialized view for request stats
CREATE MATERIALIZED VIEW IF NOT EXISTS request_stats AS
SELECT 
  e.tenant_id,
  COUNT(*) FILTER (WHERE ss.status = 'pending') as pending_swap_requests,
  COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_leave_requests
FROM employees e
LEFT JOIN shift_swaps ss ON (ss.requester_id = e.id OR ss.target_id = e.id)
LEFT JOIN leave_requests lr ON lr.employee_id = e.id
GROUP BY e.tenant_id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_request_stats_tenant ON request_stats(tenant_id);

-- Create materialized view for attendance stats
CREATE MATERIALIZED VIEW IF NOT EXISTS attendance_stats AS
SELECT 
  e.tenant_id,
  COUNT(*) FILTER (WHERE te.status = 'in-progress') as current_attendance,
  COUNT(*) FILTER (WHERE te.status IN ('in-progress', 'break')) as active_time_entries
FROM employees e
LEFT JOIN time_entries te ON te.employee_id = e.id
GROUP BY e.tenant_id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_attendance_stats_tenant ON attendance_stats(tenant_id);

-- Create function to refresh all dashboard stats
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY employee_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY shift_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY request_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY attendance_stats;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for common tenant-based queries
CREATE INDEX IF NOT EXISTS ix_employees_tenant_active ON employees(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS ix_shift_assignments_tenant_date_status ON shift_assignments(tenant_id, date, status);
CREATE INDEX IF NOT EXISTS ix_time_entries_tenant_status ON time_entries(tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_shift_swaps_tenant_status ON shift_swaps(tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_leave_requests_tenant_status ON leave_requests(tenant_id, status);

COMMIT;

-- Example usage:
-- SELECT refresh_dashboard_stats();
-- This can be run periodically (e.g., every 5 minutes) to keep stats fresh
