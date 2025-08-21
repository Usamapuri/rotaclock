import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware, isAdmin } from '@/lib/api-auth'
import { performanceMonitor } from '@/lib/performance'
import { rateLimiters, createRateLimitMiddleware, getRateLimitToken } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitToken = getRateLimitToken(request)
    const rateLimitCheck = createRateLimitMiddleware(rateLimiters.api, 20)(rateLimitToken)
    
    if (!rateLimitCheck.success) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded', 
        limit: rateLimitCheck.limit,
        remaining: rateLimitCheck.remaining,
        reset: rateLimitCheck.reset
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitCheck.limit.toString(),
          'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
          'X-RateLimit-Reset': rateLimitCheck.reset.toString(),
        }
      })
    }

    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Only admins can access performance metrics' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'clear') {
      performanceMonitor.clear()
      return NextResponse.json({ 
        success: true, 
        message: 'Performance metrics cleared' 
      })
    }

    // Get performance metrics
    const metrics = performanceMonitor.getMetrics()
    const averageResponseTime = performanceMonitor.getAverageResponseTime()
    const slowestEndpoints = performanceMonitor.getSlowestEndpoints(10)
    const cacheHitRate = performanceMonitor.getCacheHitRate()

    // Calculate additional statistics
    const totalRequests = metrics.length
    const slowRequests = metrics.filter(m => m.duration > 1000).length
    const errorRequests = metrics.filter(m => m.statusCode >= 400).length
    const successRate = totalRequests > 0 ? ((totalRequests - errorRequests) / totalRequests) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRequests,
          averageResponseTime: Math.round(averageResponseTime),
          slowRequests,
          errorRequests,
          successRate: Math.round(successRate),
          cacheHitRate: Math.round(cacheHitRate)
        },
        slowestEndpoints,
        recentMetrics: metrics.slice(-50), // Last 50 metrics
        rateLimit: {
          limit: rateLimitCheck.limit,
          remaining: rateLimitCheck.remaining,
          reset: rateLimitCheck.reset
        }
      }
    })
  } catch (error) {
    console.error('Error in GET /api/admin/performance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
