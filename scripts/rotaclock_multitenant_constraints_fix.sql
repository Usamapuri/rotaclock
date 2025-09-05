-- Idempotent fixes for composite unique keys and FKs
-- Adds UNIQUE (tenant_id, id) where needed and FKs that depend on them

-- shift_logs needs UNIQUE (tenant_id, id) for composite FKs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_logs_tenant_id_id_unique'
  ) THEN
    ALTER TABLE IF EXISTS shift_logs
      ADD CONSTRAINT shift_logs_tenant_id_id_unique UNIQUE (tenant_id, id);
  END IF;
END $$;

-- employees needs UNIQUE (tenant_id, id) for many composite FKs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_tenant_id_id_unique'
  ) THEN
    ALTER TABLE IF EXISTS employees
      ADD CONSTRAINT employees_tenant_id_id_unique UNIQUE (tenant_id, id);
  END IF;
END $$;

-- onboarding_steps and onboarding_processes also require composite unique for FKs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_steps_tenant_id_id_unique'
  ) THEN
    ALTER TABLE IF EXISTS onboarding_steps
      ADD CONSTRAINT onboarding_steps_tenant_id_id_unique UNIQUE (tenant_id, id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_processes_tenant_id_id_unique'
  ) THEN
    ALTER TABLE IF EXISTS onboarding_processes
      ADD CONSTRAINT onboarding_processes_tenant_id_id_unique UNIQUE (tenant_id, id);
  END IF;
END $$;

-- Recreate time_entry_approvals FKs if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_entry_approvals_time_entry_fk'
  ) THEN
    ALTER TABLE IF EXISTS time_entry_approvals
      ADD CONSTRAINT time_entry_approvals_time_entry_fk
      FOREIGN KEY (tenant_id, time_entry_id)
      REFERENCES shift_logs(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_entry_approvals_employee_fk'
  ) THEN
    ALTER TABLE IF EXISTS time_entry_approvals
      ADD CONSTRAINT time_entry_approvals_employee_fk
      FOREIGN KEY (tenant_id, employee_id)
      REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_entry_approvals_approver_fk'
  ) THEN
    ALTER TABLE IF EXISTS time_entry_approvals
      ADD CONSTRAINT time_entry_approvals_approver_fk
      FOREIGN KEY (tenant_id, approver_id)
      REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

-- Ensure break_logs -> shift_logs composite FK exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'break_logs_shift_fk'
  ) THEN
    ALTER TABLE IF EXISTS break_logs
      ADD CONSTRAINT break_logs_shift_fk
      FOREIGN KEY (tenant_id, shift_log_id)
      REFERENCES shift_logs(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;


