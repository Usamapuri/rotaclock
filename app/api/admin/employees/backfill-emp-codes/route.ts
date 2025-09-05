import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

// POST /api/admin/employees/backfill-emp-codes
// Adds EMP prefix to any non-EMP employee_code and pads simple numerics
export async function POST(_req: NextRequest) {
  try {
    // Ensure column exists
    await query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code TEXT`, [])

    // Create a sequence for generating unique EMP codes
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='employee_code_seq') THEN
          CREATE SEQUENCE employee_code_seq START 1;
        END IF;
      END$$;
    `, [])

    // Count rows needing update
    const before = await query(`SELECT COUNT(*)::int AS cnt FROM employees WHERE employee_code IS NULL OR employee_code !~ '^EMP'`, [])

    // Assign fresh unique EMP codes to all rows that are NULL or not starting with EMP
    await query(`
      UPDATE employees
      SET employee_code = 'EMP' || LPAD(nextval('employee_code_seq')::text, 3, '0')
      WHERE employee_code IS NULL OR employee_code !~ '^EMP'
    `, [])

    const after = await query(`SELECT COUNT(*)::int AS total FROM employees`, [])
    return NextResponse.json({ success: true, updated: before.rows[0]?.cnt ?? 0, total: after.rows[0]?.total ?? 0 })
  } catch (error) {
    console.error('EMP backfill error:', error)
    return NextResponse.json({ success: false, error: 'Failed to backfill employee codes' }, { status: 500 })
  }
}


