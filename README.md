# RotaCloud SaaS

A modern employee scheduling and time tracking SaaS application built with Next.js, TypeScript, and Supabase.

## Features

- **Employee Management**: Add, edit, and manage employee profiles
- **Shift Scheduling**: Create and assign shifts to employees
- **Time Tracking**: Clock in/out with break management
- **Admin Dashboard**: Comprehensive admin interface
- **Employee Portal**: Self-service employee interface
- **Onboarding System**: Streamlined employee onboarding process

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **UI Components**: shadcn/ui
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server: `pnpm dev`

## Demo Credentials

- **Admin**: `admin` / `admin123`
- **Employee**: `EMP001` / `emp123`

## Database Setup

Run the SQL scripts in your Supabase SQL Editor:
1. `scripts/create-complete-schema.sql` - Creates all tables
2. `scripts/demo-data.sql` - Populates with sample data