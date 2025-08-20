-- Performance Optimization Script
-- Add missing indexes to improve query performance

-- =====================================================
-- CRITICAL INDEXES FOR SLOW QUERIES
-- =====================================================

-- 1. Fix the slow employee lookup query
-- This will speed up: SELECT id, employee_id, email, role FROM employees WHERE id = $1 AND is_active = true
CREATE INDEX IF NOT EXISTS idx_employees_id_active ON employees(id, is_active);

-- 2. Add composite index for team lead queries
-- This will speed up: SELECT t.* FROM teams t WHERE t.team_lead_id = $1 AND t.is_active = true
CREATE INDEX IF NOT EXISTS idx_teams_lead_active ON teams(team_lead_id, is_active);

-- 3. Add index for employee team lookups
-- This will speed up: SELECT e.* FROM employees e WHERE e.team_id = $1 AND e.is_active = true
CREATE INDEX IF NOT EXISTS idx_employees_team_active ON employees(team_id, is_active);

-- 4. Add index for role-based queries
-- This will speed up: SELECT * FROM employees WHERE role = 'team_lead' AND is_active = true
CREATE INDEX IF NOT EXISTS idx_employees_role_active ON employees(role, is_active);

-- 5. Add index for email lookups
-- This will speed up: SELECT * FROM employees WHERE email = $1 AND is_active = true
CREATE INDEX IF NOT EXISTS idx_employees_email_active ON employees(email, is_active);

-- =====================================================
-- TEAM LEAD SPECIFIC INDEXES
-- =====================================================

-- 6. Optimize shift swap queries for team leads
-- This will speed up queries that filter by requester/target team
CREATE INDEX IF NOT EXISTS idx_shift_swaps_requester_target ON shift_swaps(requester_id, target_id, status);

-- 7. Optimize leave request queries for team leads
-- This will speed up: SELECT lr.* FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id WHERE e.team_id = $1
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status ON leave_requests(employee_id, status);

-- =====================================================
-- GENERAL PERFORMANCE INDEXES
-- =====================================================

-- 8. Add index for shift assignment lookups
-- This will speed up shift assignment queries
CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee_shift ON shift_assignments(employee_id, shift_id, date);

-- 9. Add index for time entry queries
-- This will speed up time entry lookups
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_clock ON time_entries(employee_id, clock_in);

-- 10. Add index for notification queries
-- This will speed up notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at);

-- =====================================================
-- ANALYZE TABLES FOR OPTIMIZATION
-- =====================================================

-- Update table statistics for better query planning
ANALYZE employees;
ANALYZE teams;
ANALYZE shift_assignments;
ANALYZE shift_swaps;
ANALYZE leave_requests;
ANALYZE time_entries;
ANALYZE notifications;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('employees', 'teams', 'shift_assignments', 'shift_swaps', 'leave_requests')
ORDER BY tablename, indexname;

-- Show current table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
