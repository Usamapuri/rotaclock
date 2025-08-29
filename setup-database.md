# Database Setup Guide for RotaClock

## Step 1: Set Up Railway PostgreSQL Database
1. Go to https://railway.app
2. Create a new project or use an existing one
3. Add a PostgreSQL database service
4. Note down your database connection details (host, port, database name, username, password)

## Step 2: Configure Environment Variables
Create a `.env.local` file in your project root with the following variables:
```
DATABASE_URL=postgresql://username:password@host:port/database
# Or use individual variables:
DB_HOST=your-railway-host
DB_PORT=your-railway-port
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
```

## Step 3: Create Database Schema
You can run the database setup in one of two ways:

### Option A: Using Railway Dashboard
1. Go to your Railway project dashboard
2. Click on your PostgreSQL database
3. Go to the **Query** tab
4. Copy and paste the entire content of `scripts/create-complete-schema.sql` and click **Run**

### Option B: Using a Database Client
1. Connect to your Railway PostgreSQL database using a client like pgAdmin, DBeaver, or psql
2. Run the content of `scripts/create-complete-schema.sql`

## Step 4: Add Sample Data
Run the content of `scripts/seed-complete-data.sql` using the same method as Step 3.

## Step 5: Add Password Field (Required for Employee Authentication)
Run the content of `scripts/add-password-field.sql` to add the password_hash column to the employees table.

## Step 6: Verify Setup
After running all scripts, you should have:
- 10 sample employees
- 5 shift types
- Current week shift assignments
- Sample time entries
- Onboarding templates and processes
- Company holidays
- Password authentication capability

## Step 7: Test Your Application
Once the database is set up, your RotaClock application should display:
- Employee data in the admin dashboard
- Shift schedules
- Time tracking functionality
- Onboarding processes
- Notifications
- Employee login functionality

## Troubleshooting
If you encounter any errors:
1. Make sure your Railway database is running and accessible
2. Verify your environment variables are correctly set
3. Run the schema script first, then the data script, then the password field script
4. Check that all tables were created successfully
5. Ensure your application can connect to the database 