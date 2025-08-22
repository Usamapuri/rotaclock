const { Pool } = require('pg')

// Railway database configuration
const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function cleanupSchedulingDatabase() {
  const client = await pool.connect()
  
  try {
    console.log('🧹 Starting scheduling database cleanup...\n')
    
    // Step 1: Backup existing data
    console.log('📋 Step 1: Creating backup of existing data...')
    
    // Backup shift assignments
    const assignmentsBackup = await client.query(`
      SELECT 
        sa.id,
        sa.employee_id,
        sa.shift_id,
        sa.date,
        sa.status,
        sa.assigned_by,
        sa.notes,
        sa.created_at,
        e.employee_id as employee_code,
        e.first_name,
        e.last_name,
        s.name as shift_name,
        s.start_time,
        s.end_time
      FROM shift_assignments sa
      LEFT JOIN employees e ON sa.employee_id = e.id
      LEFT JOIN shifts s ON sa.shift_id = s.id
      ORDER BY sa.date, e.employee_id
    `)
    
    console.log(`   ✅ Backed up ${assignmentsBackup.rows.length} shift assignments`)
    
    // Backup shifts
    const shiftsBackup = await client.query(`
      SELECT id, name, description, start_time, end_time, department, required_staff, hourly_rate, color, is_active, created_at
      FROM shifts
      ORDER BY name
    `)
    
    console.log(`   ✅ Backed up ${shiftsBackup.rows.length} shifts`)
    
    // Save backup to file (optional)
    const fs = require('fs')
    const backupData = {
      timestamp: new Date().toISOString(),
      shift_assignments: assignmentsBackup.rows,
      shifts: shiftsBackup.rows
    }
    
    fs.writeFileSync('scheduling-backup.json', JSON.stringify(backupData, null, 2))
    console.log('   ✅ Backup saved to scheduling-backup.json\n')
    
    // Step 2: Identify duplicate shifts
    console.log('🔍 Step 2: Identifying duplicate shifts...')
    
    const duplicateShifts = await client.query(`
      SELECT 
        name,
        start_time,
        end_time,
        department,
        COUNT(*) as count,
        array_agg(id) as shift_ids
      FROM shifts
      WHERE is_active = true
      GROUP BY name, start_time, end_time, department
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `)
    
    console.log(`   Found ${duplicateShifts.rows.length} groups of duplicate shifts:`)
    duplicateShifts.rows.forEach(dup => {
      console.log(`   - "${dup.name}" (${dup.start_time}-${dup.end_time}): ${dup.count} duplicates`)
    })
    
    // Step 3: Remove duplicate shifts (keep the oldest one)
    console.log('\n🗑️ Step 3: Removing duplicate shifts...')
    
    for (const dup of duplicateShifts.rows) {
      const shiftIds = dup.shift_ids
      const keepId = shiftIds[0] // Keep the first one
      const removeIds = shiftIds.slice(1) // Remove the rest
      
      console.log(`   Processing "${dup.name}": keeping ${keepId}, removing ${removeIds.length} duplicates`)
      
      // Update shift assignments to point to the kept shift
      for (const removeId of removeIds) {
        await client.query(`
          UPDATE shift_assignments 
          SET shift_id = $1, updated_at = NOW()
          WHERE shift_id = $2
        `, [keepId, removeId])
      }
      
      // Delete the duplicate shifts
      await client.query(`
        DELETE FROM shifts 
        WHERE id = ANY($1)
      `, [removeIds])
    }
    
    // Step 4: Remove hardcoded/dummy shifts
    console.log('\n🧹 Step 4: Removing hardcoded and dummy shifts...')
    
    // Remove shifts with obvious dummy names
    const dummyShifts = await client.query(`
      DELETE FROM shifts 
      WHERE 
        name ILIKE '%test%' OR
        name ILIKE '%dummy%' OR
        name ILIKE '%sample%' OR
        name ILIKE '%example%' OR
        name ILIKE '%temp%' OR
        name ILIKE '%placeholder%' OR
        name = '' OR
        name IS NULL
      RETURNING id, name
    `)
    
    console.log(`   Removed ${dummyShifts.rows.length} dummy shifts:`)
    dummyShifts.rows.forEach(shift => {
      console.log(`   - "${shift.name}" (${shift.id})`)
    })
    
    // Step 5: Clean up orphaned shift assignments
    console.log('\n🔗 Step 5: Cleaning up orphaned shift assignments...')
    
    const orphanedAssignments = await client.query(`
      DELETE FROM shift_assignments 
      WHERE shift_id NOT IN (SELECT id FROM shifts)
      RETURNING id, employee_id, shift_id, date
    `)
    
    console.log(`   Removed ${orphanedAssignments.rows.length} orphaned shift assignments`)
    
    // Step 6: Verify cleanup results
    console.log('\n✅ Step 6: Verifying cleanup results...')
    
    const finalShifts = await client.query('SELECT COUNT(*) FROM shifts WHERE is_active = true')
    const finalAssignments = await client.query('SELECT COUNT(*) FROM shift_assignments')
    const finalEmployees = await client.query('SELECT COUNT(*) FROM employees WHERE is_active = true')
    
    console.log(`   Final counts:`)
    console.log(`   - Active shifts: ${finalShifts.rows[0].count}`)
    console.log(`   - Shift assignments: ${finalAssignments.rows[0].count}`)
    console.log(`   - Active employees: ${finalEmployees.rows[0].count}`)
    
    // Step 7: Create clean shift templates
    console.log('\n📝 Step 7: Creating clean shift templates...')
    
    // Remove all existing shifts and create clean templates
    await client.query('DELETE FROM shifts')
    
    const cleanShifts = [
      { name: 'Morning Shift', start_time: '09:00', end_time: '17:00', department: 'General', color: '#3B82F6' },
      { name: 'Afternoon Shift', start_time: '13:00', end_time: '21:00', department: 'General', color: '#10B981' },
      { name: 'Night Shift', start_time: '21:00', end_time: '05:00', department: 'General', color: '#6366F1' },
      { name: 'Part-time Morning', start_time: '09:00', end_time: '13:00', department: 'General', color: '#F59E0B' },
      { name: 'Part-time Afternoon', start_time: '14:00', end_time: '18:00', department: 'General', color: '#EF4444' }
    ]
    
    for (const shift of cleanShifts) {
      await client.query(`
        INSERT INTO shifts (name, start_time, end_time, department, color, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      `, [shift.name, shift.start_time, shift.end_time, shift.department, shift.color])
    }
    
    console.log(`   Created ${cleanShifts.length} clean shift templates`)
    
    // Step 8: Final verification
    console.log('\n🎉 Step 8: Final verification...')
    
    const verificationShifts = await client.query(`
      SELECT name, start_time, end_time, department, color
      FROM shifts
      WHERE is_active = true
      ORDER BY name
    `)
    
    console.log('   Clean shift templates:')
    verificationShifts.rows.forEach(shift => {
      console.log(`   - ${shift.name}: ${shift.start_time}-${shift.end_time} (${shift.department})`)
    })
    
    console.log('\n✅ Database cleanup completed successfully!')
    console.log('📋 Summary:')
    console.log(`   - Removed ${duplicateShifts.rows.length} duplicate shift groups`)
    console.log(`   - Removed ${dummyShifts.rows.length} dummy shifts`)
    console.log(`   - Removed ${orphanedAssignments.rows.length} orphaned assignments`)
    console.log(`   - Created ${cleanShifts.length} clean shift templates`)
    console.log('   - Backup saved to scheduling-backup.json')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the cleanup
cleanupSchedulingDatabase()
  .then(() => {
    console.log('\n🚀 Ready for new scheduling dashboard implementation!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error)
    process.exit(1)
  })
