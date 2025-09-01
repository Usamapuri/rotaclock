const { Pool } = require('pg')

// Railway database configuration
const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function testOrganizationSignup() {
  try {
    console.log('🧪 Testing Organization Signup API...\n')

    // Test data
    const testData = {
      organizationName: 'Test Company Ltd',
      organizationEmail: 'admin@testcompany.com',
      organizationPhone: '+92 300 1234567',
      organizationAddress: '123 Test Street',
      organizationCity: 'Karachi',
      organizationState: 'Sindh',
      organizationCountry: 'Pakistan',
      organizationIndustry: 'Technology',
      organizationSize: '11-50 employees',
      adminFirstName: 'John',
      adminLastName: 'Doe',
      adminEmail: 'john.doe@testcompany.com',
      adminPhone: '+92 300 7654321',
      adminPassword: 'password123',
      selectedPlan: 'starter'
    }

    console.log('📋 Test Data:')
    console.log(`   Organization: ${testData.organizationName}`)
    console.log(`   Admin: ${testData.adminFirstName} ${testData.adminLastName}`)
    console.log(`   Email: ${testData.adminEmail}`)
    console.log(`   Plan: ${testData.selectedPlan}\n`)

    // Make API call
    console.log('🚀 Making API call to /api/organizations/signup...')
    
    const response = await fetch('http://localhost:3000/api/organizations/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })

    const result = await response.json()
    
    console.log('📊 API Response:')
    console.log(`   Status: ${response.status}`)
    console.log(`   Success: ${result.success}`)
    
    if (result.success) {
      console.log('✅ Organization created successfully!')
      console.log(`   Organization ID: ${result.data.organization.id}`)
      console.log(`   Tenant ID: ${result.data.organization.tenant_id}`)
      console.log(`   Admin ID: ${result.data.admin.id}`)
      console.log(`   Employee Code: ${result.data.admin.employee_code}`)
    } else {
      console.log('❌ Organization creation failed:')
      console.log(`   Error: ${result.error}`)
    }

    // Verify in database
    console.log('\n🔍 Verifying in database...')
    
    if (result.success) {
      const orgResult = await pool.query(
        'SELECT * FROM organizations WHERE tenant_id = $1',
        [result.data.organization.tenant_id]
      )
      
      if (orgResult.rows.length > 0) {
        const org = orgResult.rows[0]
        console.log('✅ Organization found in database:')
        console.log(`   Name: ${org.name}`)
        console.log(`   Email: ${org.email}`)
        console.log(`   Status: ${org.subscription_status}`)
        console.log(`   Plan: ${org.subscription_plan}`)
      } else {
        console.log('❌ Organization not found in database')
      }

      const adminResult = await pool.query(
        'SELECT * FROM employees_new WHERE email = $1',
        [testData.adminEmail]
      )
      
      if (adminResult.rows.length > 0) {
        const admin = adminResult.rows[0]
        console.log('✅ Admin user found in database:')
        console.log(`   Name: ${admin.first_name} ${admin.last_name}`)
        console.log(`   Role: ${admin.role}`)
        console.log(`   Tenant ID: ${admin.tenant_id}`)
      } else {
        console.log('❌ Admin user not found in database')
      }

      const adminRelResult = await pool.query(
        'SELECT * FROM organization_admins WHERE organization_id = $1',
        [result.data.organization.id]
      )
      
      if (adminRelResult.rows.length > 0) {
        const adminRel = adminRelResult.rows[0]
        console.log('✅ Organization admin relationship found:')
        console.log(`   Role: ${adminRel.role}`)
        console.log(`   Permissions: ${adminRel.permissions}`)
      } else {
        console.log('❌ Organization admin relationship not found')
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await pool.end()
  }
}

// Check if Next.js server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    return response.ok
  } catch (error) {
    return false
  }
}

async function main() {
  console.log('🔍 Checking if Next.js server is running...')
  
  const serverRunning = await checkServer()
  
  if (!serverRunning) {
    console.log('❌ Next.js server is not running on http://localhost:3000')
    console.log('💡 Please start the server with: npm run dev')
    process.exit(1)
  }
  
  console.log('✅ Next.js server is running\n')
  
  await testOrganizationSignup()
}

main().catch(console.error)
