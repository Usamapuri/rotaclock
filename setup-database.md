# Database Setup Guide for RotaCloud

## Step 1: Access Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project: `supabase-violet-window`
3. Click on **SQL Editor** in the left sidebar

## Step 2: Create Database Schema
Copy and paste the entire content of `scripts/create-complete-schema.sql` into the SQL Editor and click **Run**.

## Step 3: Add Sample Data
Copy and paste the entire content of `scripts/seed-complete-data.sql` into the SQL Editor and click **Run**.

## Step 4: Verify Setup
After running both scripts, you should have:
- 10 sample employees
- 5 shift types
- Current week shift assignments
- Sample time entries
- Onboarding templates and processes
- Company holidays

## Step 5: Test Your Application
Once the database is set up, your RotaCloud application should display:
- Employee data in the admin dashboard
- Shift schedules
- Time tracking functionality
- Onboarding processes
- Notifications

## Troubleshooting
If you encounter any errors:
1. Make sure you're in the correct Supabase project
2. Run the schema script first, then the data script
3. Check that all tables were created successfully
4. Verify environment variables are set in Vercel 