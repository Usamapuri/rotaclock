# 🚀 Vercel Deployment Guide

## 📋 Prerequisites

1. **GitHub Repository**: Your code is already pushed to GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Railway Database**: Your PostgreSQL database is already set up on Railway

## 🔧 Deployment Steps

### 1. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository: `https://github.com/Usamapuri/rotaclock.git`
4. Select the repository and click "Import"

### 2. Configure Environment Variables

In your Vercel project settings, add these environment variables:

```bash
# Database Configuration (Railway)
DATABASE_URL=postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway

# Database Connection Details (for direct connection)
DB_HOST=maglev.proxy.rlwy.net
DB_PORT=36050
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz

# Next.js Configuration
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=your-secret-key-here

# Application Configuration
NODE_ENV=production
```

### 3. Build Configuration

Vercel will automatically detect this is a Next.js project. The build settings should be:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`


### 4. Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete (should take 2-3 minutes)
3. Your app will be available at: `https://your-project-name.vercel.app`

## 🔐 Environment Variables Details

### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway` | Full database connection string |
| `DB_HOST` | `maglev.proxy.rlwy.net` | Database host |
| `DB_PORT` | `36050` | Database port |
| `DB_NAME` | `railway` | Database name |
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | `tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz` | Database password |
| `NEXTAUTH_URL` | `https://your-vercel-domain.vercel.app` | Your Vercel domain |
| `NEXTAUTH_SECRET` | `your-secret-key-here` | Generate a random secret |

### Generate NEXTAUTH_SECRET

You can generate a secure secret using:

```bash
openssl rand -base64 32
```

Or use an online generator and set it to something like:
```
my-super-secret-key-for-nextauth-2024
```

## 🧪 Testing After Deployment

### 1. Test Login Credentials

Use these credentials to test the unified login system:

**Unified Login URL:** `https://your-domain.vercel.app/login`

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@rotaclock.com` | `password123` |
| **Project Manager** | `sarah.johnson@rotaclock.com` | `password123` |
| **Team Lead** | `david.wilson@rotaclock.com` | `password123` |
| **Employee** | `john.smith@rotaclock.com` | `password123` |

**Additional Employee Accounts:**
- `emma.davis@rotaclock.com` / `password123`
- `alex.brown@rotaclock.com` / `password123`
- `maria.rodriguez@rotaclock.com` / `password123`
- `james.taylor@rotaclock.com` / `password123`
- `sophia.anderson@rotaclock.com` / `password123`

### 2. Test Key Features

1. **Break System**: Login as an employee, start a shift, take a break, end break
2. **Team Lead Dashboard**: Login as TL001, check team member statuses
3. **Project Manager Dashboard**: Login as PM001, view projects and teams
4. **Shift Assignments**: Check employee dashboard for upcoming shifts
5. **Notifications**: Test the notification system

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify all database environment variables are set correctly
   - Check if Railway database is accessible from Vercel

2. **Build Failures**
   - Check the build logs in Vercel dashboard
   - Ensure all dependencies are in `package.json`

3. **Authentication Issues**
   - Verify `NEXTAUTH_URL` matches your Vercel domain exactly
   - Check `NEXTAUTH_SECRET` is set

4. **API Errors**
   - Check Vercel function logs
   - Verify database queries are working

### Debugging

1. **Check Vercel Logs**: Go to your project → Functions → View logs
2. **Database Connection**: Test connection from Vercel to Railway
3. **Environment Variables**: Verify all variables are set in Vercel dashboard

## 📊 Monitoring

### Vercel Analytics

1. Enable Vercel Analytics in your project settings
2. Monitor performance and errors
3. Set up alerts for build failures

### Database Monitoring

1. Use Railway dashboard to monitor database performance
2. Check for slow queries
3. Monitor connection limits

## 🚀 Post-Deployment

### 1. Custom Domain (Optional)

1. Go to your Vercel project settings
2. Add your custom domain
3. Update `NEXTAUTH_URL` to match your custom domain

### 2. SSL Certificate

Vercel automatically provides SSL certificates for all deployments.

### 3. Performance Optimization

1. Enable Vercel Edge Functions for better performance
2. Use Vercel Image Optimization
3. Enable caching where appropriate

## 📞 Support

If you encounter issues:

1. Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
2. Review the application logs in Vercel dashboard
3. Test database connectivity
4. Verify all environment variables are set correctly

## 🎉 Success!

Once deployed, your application will be available at:
`https://your-project-name.vercel.app`

The system includes:
- ✅ **Unified Login System** - Single login page for all user types
- ✅ **Email-Based Authentication** - Modern, intuitive login experience
- ✅ **Automatic Role Routing** - Users automatically directed to appropriate dashboards
- ✅ Complete role-based authentication
- ✅ Real-time team monitoring
- ✅ Shift management system
- ✅ Break tracking
- ✅ Performance metrics
- ✅ Notification system
- ✅ Mobile-responsive design

Happy coding! 🚀
