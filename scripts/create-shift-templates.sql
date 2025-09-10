-- Create shift_templates table if it does not exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS shift_templates (
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
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes matching optimized schema
CREATE INDEX IF NOT EXISTS idx_shift_templates_department ON shift_templates(department);
CREATE INDEX IF NOT EXISTS idx_shift_templates_active ON shift_templates(is_active);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_shift_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_shift_templates_updated_at
      BEFORE UPDATE ON shift_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


