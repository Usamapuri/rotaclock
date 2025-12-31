-- =====================================================
-- MIGRATION VERIFICATION SCRIPT
-- =====================================================
-- Run this after applying 20250101_fix_missing_schema.sql
-- to verify all schema changes were applied successfully
-- =====================================================

\echo '==========================================';
\echo 'VERIFYING MIGRATION...';
\echo '==========================================';
\echo '';

-- 1. Check if locations table exists and has data
\echo '1. Checking locations table...';
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') 
    THEN '✓ locations table exists'
    ELSE '✗ locations table MISSING'
  END as status;

SELECT COUNT(*) as location_count FROM locations;
\echo '';

-- 2. Check if manager_locations table exists
\echo '2. Checking manager_locations table...';
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manager_locations') 
    THEN '✓ manager_locations table exists'
    ELSE '✗ manager_locations table MISSING'
  END as status;
\echo '';

-- 3. Check if tenant_settings table exists
\echo '3. Checking tenant_settings table...';
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_settings') 
    THEN '✓ tenant_settings table exists'
    ELSE '✗ tenant_settings table MISSING'
  END as status;
\echo '';

-- 4. Check if pay_periods table exists
\echo '4. Checking pay_periods table...';
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pay_periods') 
    THEN '✓ pay_periods table exists'
    ELSE '✗ pay_periods table MISSING'
  END as status;
\echo '';

-- 5. Check time_entries approval columns
\echo '5. Checking time_entries approval columns...';
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejection_reason', 'admin_notes', 'approved_hours', 'approved_rate', 'total_pay')
    THEN '✓'
    ELSE '?'
  END as status
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejection_reason', 'admin_notes', 'approved_hours', 'approved_rate', 'total_pay')
ORDER BY column_name;
\echo '';

-- 6. Check employees location_id column
\echo '6. Checking employees.location_id column...';
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name = 'location_id';

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'location_id'
    ) 
    THEN '✓ employees.location_id exists'
    ELSE '✗ employees.location_id MISSING'
  END as status;
\echo '';

-- 7. Check foreign key constraints
\echo '7. Checking foreign key constraints...';
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (
  tc.table_name = 'manager_locations' 
  OR (tc.table_name = 'employees' AND kcu.column_name = 'location_id')
  OR (tc.table_name = 'time_entries' AND kcu.column_name = 'approved_by')
)
ORDER BY tc.table_name, kcu.column_name;
\echo '';

-- 8. Check indexes
\echo '8. Checking indexes...';
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE schemaname = 'public'
AND (
  indexname LIKE 'idx_locations_%' 
  OR indexname LIKE 'idx_manager_locations_%'
  OR indexname LIKE 'idx_employees_location_%'
  OR indexname LIKE 'idx_time_entries_approval_%'
)
ORDER BY tablename, indexname;
\echo '';

-- 9. Check triggers
\echo '9. Checking triggers...';
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('locations', 'tenant_settings')
ORDER BY event_object_table, trigger_name;
\echo '';

-- 10. Sample data check
\echo '10. Checking data integrity...';
\echo 'Organizations:';
SELECT tenant_id, name, subscription_status FROM organizations LIMIT 5;
\echo '';

\echo 'Employees with locations:';
SELECT 
  e.id,
  e.employee_code,
  e.first_name,
  e.last_name,
  e.location_id,
  l.name as location_name
FROM employees e
LEFT JOIN locations l ON e.location_id = l.id
LIMIT 5;
\echo '';

\echo 'Time entries with approval status:';
SELECT 
  COUNT(*) as total_entries,
  approval_status,
  status
FROM time_entries
GROUP BY approval_status, status
ORDER BY approval_status, status;
\echo '';

-- Summary
\echo '==========================================';
\echo 'MIGRATION VERIFICATION COMPLETE';
\echo '==========================================';
\echo '';
\echo 'Next steps:';
\echo '1. If any checks show MISSING, re-run the migration';
\echo '2. Create at least one location if location_count = 0';
\echo '3. Assign employees to locations if needed';
\echo '4. Restart your application';
\echo '5. Test the admin dashboard, reports, and employee pages';
\echo '';

