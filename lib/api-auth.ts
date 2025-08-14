import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from './auth'

// Simple API authentication middleware for demo purposes
export function createApiAuthMiddleware() {
  return async (request: NextRequest) => {
    // For demo purposes, we'll bypass strict authentication
    // In production, you'd want proper JWT validation here
    
    // Check if there's any authentication header or session
    const authHeader = request.headers.get('authorization')
    const sessionHeader = request.headers.get('x-session')
    
    // For demo, we'll allow requests through but log them
    console.log('API Request:', {
      method: request.method,
      url: request.url,
      hasAuth: !!authHeader,
      hasSession: !!sessionHeader
    })
    
    // For demo purposes, allow all requests but return a generic admin user
    // In a real app, you'd extract user info from JWT or session
    // Use a valid employee ID from the database
    return {
      user: {
        id: '3cae45f4-f119-41d2-b24f-66a7249cf974', // Use a valid employee ID from the database
        email: 'john.doe@company.com',
        role: 'admin'
      },
      isAuthenticated: true
    }
  }
}

// Helper function to check if user is admin
export function isAdmin(user: any): boolean {
  return user?.role === 'admin' || user?.position?.toLowerCase().includes('admin')
}

// Helper function to check if user is employee
export function isEmployee(user: any): boolean {
  return user?.role === 'employee' || user?.employeeId
} 