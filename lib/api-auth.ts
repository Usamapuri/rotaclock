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
    
    // Return a mock user for demo purposes
    return {
      user: {
        id: 'demo-user',
        email: 'demo@company.com',
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