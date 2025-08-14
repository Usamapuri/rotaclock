import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, appendFileSync, existsSync } from 'fs'
import { join } from 'path'
import { AuthService } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { imageData, employeeId, verificationType = 'shift_start' } = await request.json()

    if (!imageData || !employeeId) {
      return NextResponse.json(
        { error: 'Image data and employee ID are required' },
        { status: 400 }
      )
    }

    // Get current user info - for demo purposes, allow if employeeId is provided
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser && !employeeId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Create verification data
    const timestamp = new Date().toISOString()
    const verificationData = {
      employee_id: employeeId,
      user_id: currentUser?.id || employeeId,
      verification_type: verificationType,
      timestamp: timestamp,
      image_data: imageData,
      status: 'verified'
    }

    // Save to CSV file
    const csvPath = join(process.cwd(), 'verification_logs.csv')
    const csvHeader = 'employee_id,user_id,verification_type,timestamp,status\n'
    const csvRow = `${verificationData.employee_id},${verificationData.user_id},${verificationData.verification_type},${verificationData.timestamp},${verificationData.status}\n`

    // Create file with header if it doesn't exist
    if (!existsSync(csvPath)) {
      writeFileSync(csvPath, csvHeader)
    }

    // Append the verification record
    appendFileSync(csvPath, csvRow)

    // Save the actual image data to a separate file (base64 encoded)
    const imageFileName = `verification_${employeeId}_${Date.now()}.txt`
    const imageDir = join(process.cwd(), 'verification_images')
    const imagePath = join(imageDir, imageFileName)
    
    // Ensure the directory exists
    if (!existsSync(imageDir)) {
      // Create directory recursively
      const fs = require('fs')
      fs.mkdirSync(imageDir, { recursive: true })
    }

    // Save the base64 image data
    writeFileSync(imagePath, imageData)

    console.log(`Verification photo saved for employee ${employeeId} at ${timestamp}`)

    return NextResponse.json({
      success: true,
      message: 'Verification photo saved successfully',
      verification_id: `${employeeId}_${Date.now()}`,
      timestamp: timestamp
    })

  } catch (error) {
    console.error('Error saving verification photo:', error)
    return NextResponse.json(
      { error: 'Failed to save verification photo' },
      { status: 500 }
    )
  }
}
