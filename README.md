# RotaCloud - Complete Employee Management System

A comprehensive employee management system built with Next.js, TypeScript, and PostgreSQL, featuring time tracking, shift management, leave requests, and detailed reporting.

## 🚀 Features

### Core Functionality
- **Employee Management**: Complete CRUD operations for employee records
- **Shift Management**: Create and assign shifts to employees
- **Time Tracking**: Clock in/out functionality with break management
- **Leave Requests**: Submit and manage leave requests
- **Shift Swaps**: Request and approve shift swaps between employees
- **Reporting**: Comprehensive attendance, payroll, and department reports
- **Onboarding**: Employee onboarding process management
- **Notifications**: Real-time notification system

### User Roles
- **Admin**: Full system access with employee management and reporting
- **Employee**: Self-service features including time tracking and leave requests

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS, Shadcn/ui
- **Database**: PostgreSQL (hosted on Railway)
- **Authentication**: Custom authentication system
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Railway account (for database hosting)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd rotacloud-complete
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Database Setup

#### Option A: Using Railway (Recommended)
1. Create a Railway account and new PostgreSQL database
2. Get your database connection details
3. Update the database configuration in `lib/database.ts`

#### Option B: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a new database
3. Run the setup script: `npm run db:setup`

### 4. Environment Variables
Create a `.env.local` file:
```env
# Database Configuration
DATABASE_URL=your_postgresql_connection_string

# Application Settings
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
```

### 5. Database Schema
Run the database setup script:
```bash
npm run db:setup
```

### 6. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
rotacloud-complete/
├── app/                          # Next.js app directory
│   ├── admin/                    # Admin dashboard pages
│   ├── employee/                 # Employee dashboard pages
│   ├── api/                      # API routes
│   └── globals.css              # Global styles
├── components/                   # Reusable UI components
│   └── ui/                      # Shadcn/ui components
├── lib/                         # Utility libraries
│   ├── api-service.ts           # API service layer
│   ├── database.ts              # Database configuration
│   └── auth.ts                  # Authentication utilities
├── hooks/                       # Custom React hooks
├── scripts/                     # Database setup scripts
└── public/                      # Static assets
```

## 🔧 API Endpoints

### Employee Management
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `PUT /api/employees` - Update employee
- `DELETE /api/employees` - Delete employee

### Shift Management
- `GET /api/shifts` - List shifts
- `POST /api/shifts` - Create shift
- `PUT /api/shifts` - Update shift
- `DELETE /api/shifts` - Delete shift

### Shift Assignments
- `GET /api/shifts/assignments` - Get assignments
- `POST /api/shifts/assignments` - Create assignment

### Time Tracking
- `GET /api/time/entries` - Get time entries
- `POST /api/time/clock-in` - Clock in
- `POST /api/time/clock-out` - Clock out

### Leave Requests
- `GET /api/leave-requests` - Get leave requests
- `POST /api/leave-requests` - Create leave request

### Shift Swaps
- `GET /api/shifts/swap-requests` - Get swap requests
- `POST /api/shifts/swap-requests` - Create swap request

### Reports
- `GET /api/reports?type=attendance` - Attendance report
- `GET /api/reports?type=payroll` - Payroll report
- `GET /api/reports?type=departments` - Department report

## 🎯 Key Features Implementation

### 1. TypeScript Integration
- Full TypeScript support with strict type checking
- Comprehensive type definitions for all API responses
- Type-safe API service layer

### 2. API Service Layer
The `lib/api-service.ts` file provides a centralized API service with:
- Type-safe API calls
- Error handling
- Request/response validation
- Consistent error messages

### 3. Database Integration
- PostgreSQL with connection pooling
- Comprehensive database schema
- Optimized queries for performance
- Transaction support

### 4. Authentication System
- Custom authentication middleware
- Role-based access control
- Session management
- API route protection

### 5. Real-time Features
- Live notifications
- Real-time updates
- WebSocket support (ready for implementation)

## 🔒 Security Features

- Input validation with Zod
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting (ready for implementation)

## 📊 Reporting System

### Available Reports
1. **Attendance Report**: Employee attendance statistics
2. **Payroll Report**: Salary and overtime calculations
3. **Department Report**: Department-wise performance metrics
4. **Employee Performance**: Individual employee metrics

### Report Features
- Date range filtering
- Department filtering
- Export capabilities
- Interactive charts
- Summary statistics

## 🎨 UI/UX Features

- Responsive design for all devices
- Dark/light theme support
- Accessibility compliant
- Modern, clean interface
- Loading states and error handling
- Toast notifications

## 🚀 Deployment

### Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables
3. Deploy automatically

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy with automatic CI/CD

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

Run type checking:
```bash
npm run type-check
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify your DATABASE_URL is correct
   - Check if your database is accessible
   - Ensure the database schema is set up

2. **TypeScript Errors**
   - Run `npm run type-check` to identify issues
   - Ensure all dependencies are installed
   - Check for missing type definitions

3. **API Errors**
   - Check the browser console for error messages
   - Verify API endpoints are correctly implemented
   - Check authentication headers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the troubleshooting section

## 🔄 Recent Updates

### Version 2.0.0
- ✅ Fixed all TypeScript errors
- ✅ Implemented comprehensive API service layer
- ✅ Removed all hardcoded data
- ✅ Added proper error handling
- ✅ Improved type safety
- ✅ Enhanced API documentation
- ✅ Added comprehensive reporting system
- ✅ Implemented proper authentication
- ✅ Added real-time features support

---

**RotaCloud** - Streamlining employee management for modern businesses.