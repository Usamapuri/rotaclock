# Railway Database Migration Guide

## Problem Summary

Your Railway PostgreSQL database is missing critical schema elements that the RotaClock application expects:

1. **Missing Table**: `locations` table doesn't exist
2. **Missing Columns**: `time_entries.approval_status` and related approval columns
3. **Missing Table**: `manager_locations` for mapping managers to locations
4. **Missing Columns**: Employee-related columns (location_id, address, emergency contacts)

## Solution Overview

We've created a migration script (`scripts/20250101_fix_missing_schema.sql`) that will:
- Create the `locations` table
- Create the `manager_locations` table  
- Add `location_id` to employees table
- Add all approval-related columns to `time_entries`
- Add supporting tables (`tenant_settings`, `pay_periods`)
- Create necessary indexes for performance

---

## Migration Steps

### Option 1: Using the Railway Dashboard (Recommended for Quick Fix)

1. **Access Railway Database**
   - Go to https://railway.app/
   - Open your project
   - Click on your PostgreSQL service
   - Click on "Data" tab
   - Click "Query" button

2. **Run the Migration**
   - Copy the contents of `scripts/20250101_fix_missing_schema.sql`
   - Paste into the query editor
   - Click "Run Query"
   - Wait for confirmation (should see "Commit successful")

3. **Verify the Migration**
   ```sql
   -- Check if locations table exists
   SELECT COUNT(*) FROM locations;
   
   -- Check if approval_status column exists
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'time_entries' 
   AND column_name = 'approval_status';
   
   -- Check if location_id exists in employees
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'employees' 
   AND column_name = 'location_id';
   ```

---

### Option 2: Using Railway CLI (Recommended for Production)

1. **Install Railway CLI** (if not already installed)
   ```bash
   npm install -g @railway/cli
   # or
   brew install railway
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Link to Your Project**
   ```bash
   railway link
   # Select your RotaClock project
   ```

4. **Get Database Connection String**
   ```bash
   railway variables
   # Look for DATABASE_URL
   ```

5. **Run Migration Using Node Script**
   ```bash
   node scripts/run_sql.js "<YOUR_DATABASE_URL>" scripts/20250101_fix_missing_schema.sql
   ```

   Example:
   ```bash
   node scripts/run_sql.js "postgresql://postgres:password@hopper.proxy.rlwy.net:48063/railway" scripts/20250101_fix_missing_schema.sql
   ```

---

### Option 3: Using Local PostgreSQL Client (psql)

1. **Get Railway Database Connection Details**
   - Go to Railway Dashboard → Your PostgreSQL Service → Connect
   - Copy the connection details

2. **Connect via psql**
   ```bash
   psql "postgresql://postgres:password@hopper.proxy.rlwy.net:48063/railway"
   ```

3. **Run the Migration File**
   ```bash
   # From psql prompt:
   \i scripts/20250101_fix_missing_schema.sql
   ```

---

## Post-Migration Steps

### 1. Verify Schema Changes

Run these queries in Railway dashboard or psql to verify:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('locations', 'manager_locations', 'tenant_settings', 'pay_periods');

-- Check time_entries has approval columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejection_reason');

-- Check employees has location_id
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name = 'location_id';
```

### 2. Create Initial Location(s)

Your application will need at least one location to function properly. Create one:

```sql
-- Get your tenant_id first
SELECT tenant_id FROM organizations LIMIT 1;

-- Create a default location (replace 'your-tenant-id' with actual value)
INSERT INTO locations (tenant_id, organization_id, name, description, is_active)
SELECT 
  tenant_id, 
  id as organization_id,
  'Main Office' as name,
  'Primary company location' as description,
  true as is_active
FROM organizations 
WHERE tenant_id = 'your-tenant-id'
RETURNING *;
```

### 3. Update Existing Employees (Optional)

If you want to assign all existing employees to the new location:

```sql
-- Assign all employees to the location you just created
UPDATE employees 
SET location_id = (SELECT id FROM locations WHERE name = 'Main Office' LIMIT 1)
WHERE location_id IS NULL
AND tenant_id = 'your-tenant-id';
```

### 4. Restart Your Railway Application

After migration, restart your application to clear any cached connections:

```bash
railway up --detach
# or from Railway Dashboard: Click "Restart" on your web service
```

### 5. Test the Application

1. **Test Reports Page**
   - Navigate to `/admin/reports`
   - Should load without "relation 'locations' does not exist" error

2. **Test Employees Page**
   - Navigate to `/admin/employees`
   - Should load the employee list successfully

3. **Test Shift Approvals**
   - Navigate to `/admin/shift-approvals`
   - Should load without "column approval_status does not exist" error

---

## Rollback Plan (If Needed)

If something goes wrong, you can rollback specific changes:

```sql
BEGIN;

-- Drop newly created tables (if needed)
DROP TABLE IF EXISTS pay_periods CASCADE;
DROP TABLE IF EXISTS tenant_settings CASCADE;
DROP TABLE IF EXISTS manager_locations CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

-- Remove columns from time_entries (if needed)
ALTER TABLE time_entries DROP COLUMN IF EXISTS approval_status;
ALTER TABLE time_entries DROP COLUMN IF EXISTS approved_by;
ALTER TABLE time_entries DROP COLUMN IF EXISTS approved_at;
ALTER TABLE time_entries DROP COLUMN IF EXISTS rejection_reason;
ALTER TABLE time_entries DROP COLUMN IF EXISTS admin_notes;
ALTER TABLE time_entries DROP COLUMN IF EXISTS approved_hours;
ALTER TABLE time_entries DROP COLUMN IF EXISTS approved_rate;
ALTER TABLE time_entries DROP COLUMN IF EXISTS total_pay;

-- Remove location_id from employees (if needed)
ALTER TABLE employees DROP COLUMN IF EXISTS location_id;

COMMIT;
```

**⚠️ WARNING**: Only run rollback if absolutely necessary and you understand the implications!

---

## Troubleshooting

### Error: "relation already exists"

This is safe to ignore - the migration script uses `IF NOT EXISTS` clauses to prevent errors if tables/columns already exist.

### Error: "permission denied"

Ensure you're using the correct DATABASE_URL with full privileges. Railway PostgreSQL databases should have full admin access by default.

### Error: "could not connect to server"

Check your connection string and ensure:
- Railway PostgreSQL service is running
- Your IP is not blocked (Railway allows all IPs by default)
- SSL settings are correct (`ssl: { rejectUnauthorized: false }`)

### Application Still Shows Errors After Migration

1. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run build
   ```

2. Restart the Railway service completely

3. Check Railway logs for any connection pool issues:
   ```bash
   railway logs
   ```

---

## Future Schema Changes

For future database changes:

1. **Create Migration File**: Add new SQL file to `scripts/` directory with naming convention: `YYYYMMDD_description.sql`

2. **Test Locally**: Test on a local PostgreSQL instance first

3. **Run on Railway**: Use `node scripts/run_sql.js` to apply

4. **Update Schema File**: Keep `database-schema.sql` as the single source of truth

---

## Contact & Support

If you encounter any issues:

1. Check Railway logs: `railway logs`
2. Check application logs in Railway dashboard
3. Verify DATABASE_URL environment variable is correct
4. Ensure all migrations completed successfully

---

## Summary

After running this migration, your Railway database will have:

✅ `locations` table for managing office locations  
✅ `manager_locations` table for manager-location assignments  
✅ `time_entries.approval_status` and related approval columns  
✅ `employees.location_id` for employee-location mapping  
✅ `tenant_settings` for per-tenant configuration  
✅ `pay_periods` for payroll period locking  
✅ All necessary indexes for performance  
✅ Proper triggers for `updated_at` columns

Your application should now work without the 500 Internal Server Errors! 🎉

