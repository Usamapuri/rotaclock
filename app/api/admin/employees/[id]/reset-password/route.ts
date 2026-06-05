import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/database'
import { withTenant } from '@/lib/api-auth'

/**
 * POST /api/admin/employees/[id]/reset-password
 * Admin-only. Generates a random temporary password, stores its bcrypt hash,
 * and returns the plaintext once so the admin can hand it to the employee.
 * (Previously this was unauthenticated and wrote the literal "password123" in
 * plaintext to a column the login flow doesn't even read.)
 */
export const POST = withTenant(
  ['admin'],
  async (_request: NextRequest, ctx, { tenant }) => {
    try {
      const { id } = (await ctx.params) as { id: string }

      // 10 bytes -> ~13 url-safe chars; user is expected to change it after login.
      const tempPassword = randomBytes(10).toString('base64url')
      const passwordHash = await bcrypt.hash(tempPassword, 10)

      const result = await query(
        `UPDATE employees
         SET password_hash = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3
         RETURNING id, employee_code, first_name, last_name, email`,
        [passwordHash, id, tenant.tenant_id]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      }

      const employee = result.rows[0]
      return NextResponse.json({
        success: true,
        message: 'Password reset successfully',
        temporaryPassword: tempPassword,
        employee: {
          id: employee.id,
          employee_id: employee.employee_code,
          name: `${employee.first_name} ${employee.last_name}`,
          email: employee.email,
        },
      })
    } catch (error) {
      console.error('Error resetting password:', error)
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }
  }
)
