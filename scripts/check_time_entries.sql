SELECT 
  te.id,
  te.employee_id,
  te.clock_in,
  te.clock_out,
  te.status,
  te.approval_status,
  e.first_name,
  e.last_name,
  e.role
FROM time_entries te
JOIN employees e ON te.employee_id = e.id
WHERE te.status = 'completed' 
ORDER BY te.created_at DESC
LIMIT 10;
