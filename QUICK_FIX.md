# Quick Fix for Railway Database Schema Issues

## TL;DR - Fastest Fix (5 minutes)

### Step 1: Get Your Railway Database URL

```bash
# From Railway Dashboard:
# Go to your PostgreSQL service → Variables → Copy DATABASE_URL
```

### Step 2: Run the Migration

```bash
# Option A: Using the npm script (recommended)
DATABASE_URL="your-railway-connection-string" npm run db:migrate:schema

# Option B: Using node directly
node scripts/run_sql.js "your-railway-connection-string" scripts/20250101_fix_missing_schema.sql
```

### Step 3: Verify It Worked

```bash
DATABASE_URL="your-railway-connection-string" npm run db:verify
```

### Step 4: Create a Location

```sql
-- Run this in Railway Dashboard → Data → Query
INSERT INTO locations (tenant_id, name, description, is_active)
SELECT tenant_id, 'Main Office', 'Primary location', true
FROM organizations LIMIT 1
RETURNING *;
```

### Step 5: Restart Your App

```bash
# From Railway Dashboard: Click "Restart" on your web service
# Or via CLI:
railway up --detach
```

### Step 6: Test

Visit your app:
- ✅ `/admin/reports` should load
- ✅ `/admin/employees` should load  
- ✅ `/admin/shift-approvals` should load

---

## What This Fixes

| Error | Fix |
|-------|-----|
| `relation "locations" does not exist` | Creates `locations` table |
| `column te.approval_status does not exist` | Adds approval columns to `time_entries` |
| `Error in GET /api/employees` | Fixes JOIN with locations |
| `Error loading locations` | Creates required tables |

---

## Alternative: Railway Dashboard Method

1. **Go to Railway Dashboard**
   - Open your PostgreSQL service
   - Click "Data" tab
   - Click "Query"

2. **Copy & Paste**
   - Open `scripts/20250101_fix_missing_schema.sql`
   - Copy all contents
   - Paste into Railway query editor
   - Click "Run Query"

3. **Create Location** (same SQL as Step 4 above)

4. **Restart App** (same as Step 5 above)

---

## Troubleshooting

### "Migration executed successfully" but app still errors?

**Solution**: Restart the app to clear connection pool cache

```bash
railway restart
```

### "No locations found" warning?

**Solution**: Create a location using the SQL in Step 4

### Still getting errors?

**Check**:
1. Run verification: `npm run db:verify`
2. Check Railway logs: `railway logs`
3. Verify DATABASE_URL is correct
4. Make sure you're on the development branch (not production)

---

## Full Documentation

For detailed instructions, troubleshooting, and rollback procedures, see:
- `RAILWAY_MIGRATION_GUIDE.md` - Complete migration guide
- `scripts/20250101_fix_missing_schema.sql` - The migration SQL
- `scripts/verify_migration.js` - Verification script

---

## Need Help?

1. Check the logs: `railway logs`
2. Verify migration: `npm run db:verify`
3. Review full guide: `RAILWAY_MIGRATION_GUIDE.md`

