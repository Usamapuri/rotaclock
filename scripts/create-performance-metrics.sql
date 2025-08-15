-- Performance metrics table used by team queue-status and performance pages
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calls_handled INTEGER DEFAULT 0,
  avg_handle_time INTEGER DEFAULT 0,
  customer_satisfaction DECIMAL(3,2) CHECK (customer_satisfaction >= 0 AND customer_satisfaction <= 5),
  first_call_resolution_rate DECIMAL(5,2) CHECK (first_call_resolution_rate >= 0 AND first_call_resolution_rate <= 100),
  total_break_time INTEGER DEFAULT 0,
  total_work_time INTEGER DEFAULT 0,
  productivity_score DECIMAL(5,2),
  quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_employee_date ON performance_metrics(employee_id, date);


