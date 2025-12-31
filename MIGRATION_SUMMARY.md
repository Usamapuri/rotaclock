# Railway Database Migration - Complete Summary

## 🎯 Problem Identified

Your Railway PostgreSQL database was missing critical schema elements, causing 500 Internal Server Errors:

1. **Missing Table**: `locations` 
2. **Missing Table**: `manager_locations`
3. **Missing Column**: `time_entries.approval_status` (and 7 other approval columns)
4. **Missing Column**: `employees.location_id`
5. **Missing Tables**: `tenant_settings`, `pay_periods`

## ✅ Solution Provided

### Files Created

1. **`scripts/20250101_fix_missing_schema.sql`**
   - Complete migration script
   - Creates all missing tables and columns
   - Adds indexes and triggers
   - Safe to run multiple times (uses IF NOT EXISTS)

2. **`scripts/verify_migration.js`**
   - Automated verification script
   - Checks all schema changes
   - Provides detailed status report

3. **`scripts/verify_migration.sql`**
   - SQL-based verification (for psql users)
   - Comprehensive schema checks

4. **`scripts/create_default_location.js`**
   - Creates default "Main Office" location
   - Auto-assigns employees to location
   - Handles multiple tenants

5. **`RAILWAY_MIGRATION_GUIDE.md`**
   - Complete step-by-step guide
   - Multiple deployment options
   - Troubleshooting section
   - Rollback instructions

6. **`QUICK_FIX.md`**
   - TL;DR version for quick fixes
   - 5-minute deployment guide

### NPM Scripts Added

```json
{
  "db:migrate:schema": "Run the schema migration",
  "db:verify": "Verify migration succeeded",
  "db:create-location": "Create default location"
}
```

## 🚀 Quick Start (Choose One Method)

### Method 1: NPM Scripts (Fastest)

```bash
# 1. Set your DATABASE_URL
export DATABASE_URL="postgresql://postgres:password@hopper.proxy.rlwy.net:48063/railway"

# 2. Run migration
npm run db:migrate:schema

# 3. Verify it worked
npm run db:verify

# 4. Create default location
npm run db:create-location

# 5. Restart your app on Railway
```

### Method 2: Railway Dashboard (No CLI needed)

```
1. Railway Dashboard → PostgreSQL → Data → Query
2. Copy contents of scripts/20250101_fix_missing_schema.sql
3. Paste and click "Run Query"
4. Run create location SQL (see QUICK_FIX.md)
5. Restart web service
```

### Method 3: Direct Node Scripts

```bash
# Migration
node scripts/run_sql.js "your-db-url" scripts/20250101_fix_missing_schema.sql

# Verify
node scripts/verify_migration.js "your-db-url"

# Create location
node scripts/create_default_location.js "your-db-url"
```

## 📋 What Gets Created

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `locations` | Office/branch locations | id, tenant_id, name, description |
| `manager_locations` | Manager-location mapping | manager_id, location_id |
| `tenant_settings` | Per-tenant configuration | allow_manager_approvals, pay_period_type |
| `pay_periods` | Payroll period locking | start_date, end_date, status |

### Columns Added to `time_entries`

- `approval_status` (VARCHAR(20), default 'pending')
- `approved_by` (UUID, FK to employees)
- `approved_at` (TIMESTAMPTZ)
- `rejection_reason` (TEXT)
- `admin_notes` (TEXT)
- `approved_hours` (NUMERIC)
- `approved_rate` (NUMERIC)
- `total_pay` (NUMERIC)

### Columns Added to `employees`

- `location_id` (UUID, FK to locations)

### Indexes Created

- `idx_locations_tenant_id`
- `idx_locations_organization_id`
- `idx_manager_locations_tenant_id`
- `idx_manager_locations_manager_id`
- `idx_manager_locations_location_id`
- `idx_employees_location_id`
- `idx_time_entries_approval_status`
- `idx_time_entries_approved_by`

## 🔍 Verification Checklist

After running migration, verify:

- [ ] No errors in migration output
- [ ] `npm run db:verify` shows all checks passed
- [ ] At least one location exists
- [ ] Employees are assigned to locations
- [ ] Application restarts successfully
- [ ] `/admin/reports` loads without errors
- [ ] `/admin/employees` loads without errors
- [ ] `/admin/shift-approvals` loads without errors

## 🎯 Expected Results

### Before Migration

```
❌ GET /api/employees → 500 (relation "locations" does not exist)
❌ GET /api/admin/shift-approvals → 500 (column approval_status does not exist)
❌ GET /api/scheduling/week → 500 (relation "locations" does not exist)
❌ GET /api/locations → 500 (relation "locations" does not exist)
```

### After Migration

```
✅ GET /api/employees → 200 (employees with location data)
✅ GET /api/admin/shift-approvals → 200 (approvals list)
✅ GET /api/scheduling/week → 200 (schedule data)
✅ GET /api/locations → 200 (locations list)
```

## 🛠️ Database Migration Strategy

Your codebase uses **raw SQL migrations** with a custom runner:

- **Migration Tool**: `scripts/run_sql.js` (custom Node.js script)
- **Schema Source**: `database-schema.sql` (single source of truth)
- **No ORM**: No Prisma, Drizzle, or Kysely
- **Connection**: Direct PostgreSQL via `pg` library

### Migration Workflow

```
1. Create SQL file in scripts/
2. Test locally (optional)
3. Run: node scripts/run_sql.js <db-url> <sql-file>
4. Verify: node scripts/verify_migration.js <db-url>
5. Update database-schema.sql if needed
```

## 📚 Documentation Reference

| File | Purpose |
|------|---------|
| `QUICK_FIX.md` | 5-minute quick start guide |
| `RAILWAY_MIGRATION_GUIDE.md` | Complete deployment guide |
| `MIGRATION_SUMMARY.md` | This file - overview |
| `database-schema.sql` | Complete schema reference |

## 🔧 Troubleshooting

### Issue: Migration runs but errors persist

**Solution**: Restart application to clear connection pool cache

```bash
railway restart
```

### Issue: "No locations found" warning

**Solution**: Run the location creation script

```bash
npm run db:create-location
```

### Issue: Employees still show no location

**Solution**: Run SQL to assign employees

```sql
UPDATE employees 
SET location_id = (SELECT id FROM locations LIMIT 1)
WHERE location_id IS NULL AND is_active = true;
```

### Issue: Still getting 500 errors

**Checklist**:
1. Check Railway logs: `railway logs`
2. Verify migration: `npm run db:verify`
3. Check DATABASE_URL is correct
4. Ensure app restarted after migration
5. Clear Next.js cache: `rm -rf .next && npm run build`

## 🎉 Success Indicators

You'll know the migration succeeded when:

1. ✅ Verification script shows all checks passed
2. ✅ No database errors in Railway logs
3. ✅ Admin dashboard loads completely
4. ✅ Reports page shows data
5. ✅ Employee list displays with locations
6. ✅ Shift approvals page works

## 📞 Next Steps

1. **Run the migration** using your preferred method
2. **Verify success** with `npm run db:verify`
3. **Create location** with `npm run db:create-location`
4. **Restart app** on Railway
5. **Test thoroughly** - check all admin pages
6. **Monitor logs** for any remaining issues

## 🔐 Safety Notes

- ✅ Migration uses transactions (auto-rollback on error)
- ✅ Uses `IF NOT EXISTS` (safe to run multiple times)
- ✅ No data deletion (only additions)
- ✅ Backward compatible (existing data preserved)
- ✅ Rollback script provided in guide

## 📊 Impact Assessment

### Tables Affected
- ✅ `locations` - CREATED
- ✅ `manager_locations` - CREATED
- ✅ `tenant_settings` - CREATED
- ✅ `pay_periods` - CREATED
- ✅ `time_entries` - ALTERED (8 columns added)
- ✅ `employees` - ALTERED (1 column added)

### API Endpoints Fixed
- ✅ `/api/employees` (GET)
- ✅ `/api/admin/shift-approvals` (GET)
- ✅ `/api/scheduling/week/*` (GET)
- ✅ `/api/locations` (GET)
- ✅ `/admin/reports` (page)

### Zero Downtime?
- ⚠️ Brief restart required after migration
- ⚠️ Estimated downtime: < 30 seconds
- ✅ No data loss
- ✅ No breaking changes

---

**Ready to proceed?** Start with `QUICK_FIX.md` for the fastest path to resolution! 🚀

