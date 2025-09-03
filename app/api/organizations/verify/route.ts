import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: { rejectUnauthorized: false }
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const tenantId = url.searchParams.get('tenant_id') || url.searchParams.get('tenant')

    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Missing tenant_id' }, { status: 400 })
    }

    const result = await pool.query(
      'UPDATE organizations SET is_verified = true WHERE tenant_id = $1 RETURNING id, name, tenant_id, is_verified',
      [tenantId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Organization verified successfully',
      data: result.rows[0],
    })
  } catch (error) {
    console.error('Organization verification error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
