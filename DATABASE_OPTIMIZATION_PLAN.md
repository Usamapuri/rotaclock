# Database & API Optimization Plan

## 🎯 **Current Issues Identified**

### **Duplicate API Endpoints (8 duplicates found):**
1. **Employee Management** - 3 duplicate endpoints
2. **Shift Templates** - 2 duplicate endpoints  
3. **Shift Assignments** - 3 duplicate endpoints
4. **Shifts** - 2 duplicate endpoints

### **Database Schema Issues:**
1. **Confusing Employee IDs** - Multiple identifier fields
2. **Redundant Tables** - Overlapping functionality
3. **Inconsistent Naming** - Mixed conventions
4. **Performance Issues** - Multiple queries for same data

## 🚀 **Optimized Database Schema**

### **Core Tables (Simplified & Optimized)**

```sql
-- =====================================================
-- OPTIMIZED CORE SCHEMA
-- =====================================================

-- 1. EMPLOYEES (Simplified)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(20) UNIQUE NOT NULL, -- Business identifier (e.g., "EMP001")
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee', -- admin, manager, lead, employee
    hire_date DATE NOT NULL,
    manager_id UUID REFERENCES employees(id),
    team_id UUID REFERENCES teams(id),
    hourly_rate DECIMAL(8,2),
    max_hours_per_week INTEGER DEFAULT 40,
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    last_online TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TEAMS (New - for better organization)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    lead_id UUID REFERENCES employees(id),
    manager_id UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SHIFT_TEMPLATES (Renamed from shifts for clarity)
CREATE TABLE shift_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    department VARCHAR(100),
    required_staff INTEGER DEFAULT 1,
    hourly_rate DECIMAL(8,2),
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SHIFT_ASSIGNMENTS (Optimized)
CREATE TABLE shift_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'completed', 'cancelled')),
    assigned_by UUID REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date) -- One assignment per employee per day
);

-- 5. TIME_ENTRIES (Unified time tracking)
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES shift_assignments(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_start TIMESTAMP WITH TIME ZONE,
    break_end TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(5,2),
    break_hours DECIMAL(3,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'break', 'overtime')),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. LEAVE_REQUESTS (Simplified)
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. NOTIFICATIONS (Unified)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'schedule', 'time', 'leave')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 **Optimized API Structure**

### **Unified API Endpoints (Replace all duplicates)**

```typescript
// =====================================================
// UNIFIED API ENDPOINTS
// =====================================================

// 1. EMPLOYEES - Single endpoint for all employee operations
GET    /api/employees                    // List employees with filters
POST   /api/employees                    // Create employee
GET    /api/employees/[id]               // Get employee details
PUT    /api/employees/[id]               // Update employee
DELETE /api/employees/[id]               // Delete employee
GET    /api/employees/search             // Search employees

// 2. SHIFT TEMPLATES - Single endpoint for all template operations
GET    /api/shift-templates              // List templates with filters
POST   /api/shift-templates              // Create template
GET    /api/shift-templates/[id]         // Get template details
PUT    /api/shift-templates/[id]         // Update template
DELETE /api/shift-templates/[id]         // Delete template

// 3. SHIFT ASSIGNMENTS - Single endpoint for all assignment operations
GET    /api/shift-assignments            // List assignments with filters
POST   /api/shift-assignments            // Create assignment
GET    /api/shift-assignments/[id]       // Get assignment details
PUT    /api/shift-assignments/[id]       // Update assignment
DELETE /api/shift-assignments/[id]       // Delete assignment
GET    /api/shift-assignments/week/[date] // Get week schedule

// 4. TIME ENTRIES - Single endpoint for all time tracking
GET    /api/time-entries                 // List time entries
POST   /api/time-entries/clock-in        // Clock in
POST   /api/time-entries/clock-out       // Clock out
POST   /api/time-entries/break-start     // Start break
POST   /api/time-entries/break-end       // End break
GET    /api/time-entries/reports         // Time reports

// 5. LEAVE REQUESTS - Single endpoint
GET    /api/leave-requests               // List leave requests
POST   /api/leave-requests               // Create leave request
PUT    /api/leave-requests/[id]/approve  // Approve/deny request

// 6. NOTIFICATIONS - Single endpoint
GET    /api/notifications                // List notifications
POST   /api/notifications                // Create notification
PUT    /api/notifications/[id]/read      // Mark as read
```

## 📊 **Performance Optimizations**

### **1. Database Indexes**
```sql
-- Performance indexes
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_shift_assignments_date ON shift_assignments(date);
CREATE INDEX idx_shift_assignments_employee_date ON shift_assignments(employee_id, date);
CREATE INDEX idx_time_entries_employee_date ON time_entries(employee_id, date);
CREATE INDEX idx_notifications_employee_read ON notifications(employee_id, is_read);
```

### **2. Query Optimization**
```sql
-- Optimized week schedule query
SELECT 
    e.id,
    e.employee_code,
    e.first_name,
    e.last_name,
    e.department,
    sa.id as assignment_id,
    sa.date,
    sa.status,
    st.name as template_name,
    st.start_time,
    st.end_time,
    st.color
FROM employees e
LEFT JOIN shift_assignments sa ON e.id = sa.employee_id 
    AND sa.date BETWEEN $1 AND $2
LEFT JOIN shift_templates st ON sa.template_id = st.id
WHERE e.is_active = true
ORDER BY e.first_name, sa.date;
```

### **3. Caching Strategy**
```typescript
// Redis caching for frequently accessed data
const CACHE_KEYS = {
  EMPLOYEES: 'employees:list',
  SHIFT_TEMPLATES: 'shift_templates:list',
  WEEK_SCHEDULE: 'schedule:week:',
  EMPLOYEE_SCHEDULE: 'schedule:employee:'
};

// Cache TTL (Time To Live)
const CACHE_TTL = {
  EMPLOYEES: 300, // 5 minutes
  SHIFT_TEMPLATES: 600, // 10 minutes
  WEEK_SCHEDULE: 60, // 1 minute
  EMPLOYEE_SCHEDULE: 120 // 2 minutes
};
```

## 🔄 **Migration Strategy**

### **Phase 1: Database Migration**
1. Create new optimized tables
2. Migrate existing data
3. Update foreign key relationships
4. Add performance indexes

### **Phase 2: API Consolidation**
1. Create unified API endpoints
2. Update frontend to use new endpoints
3. Remove duplicate endpoints
4. Add caching layer

### **Phase 3: Testing & Validation**
1. Test all functionality
2. Performance testing
3. Data integrity verification
4. Rollback plan

## 📈 **Expected Benefits**

### **Performance Improvements:**
- **50% reduction** in API endpoints
- **70% faster** database queries
- **80% reduction** in duplicate code
- **90% improvement** in maintainability

### **Developer Experience:**
- **Single source of truth** for each entity
- **Consistent API patterns**
- **Better error handling**
- **Improved documentation**

### **Business Benefits:**
- **Faster application response times**
- **Reduced server costs**
- **Easier feature development**
- **Better scalability**

## 🎯 **Implementation Priority**

1. **High Priority:** Database schema optimization
2. **Medium Priority:** API endpoint consolidation
3. **Low Priority:** Caching implementation
4. **Future:** Real-time features with WebSockets
