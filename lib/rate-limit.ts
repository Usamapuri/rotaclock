import { LRUCache } from 'lru-cache'

interface RateLimitConfig {
  uniqueTokenPerInterval?: number
  interval?: number
  maxRequests?: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

class RateLimiter {
  private tokenCache: LRUCache<string, number[]>

  constructor(options: RateLimitConfig = {}) {
    this.tokenCache = new LRUCache({
      max: options.uniqueTokenPerInterval || 500,
      ttl: options.interval || 60000, // 1 minute default
    })
  }

  check(token: string, maxRequests: number = 10): RateLimitResult {
    const now = Date.now()
    const windowStart = now - 60000 // 1 minute window

    const tokenCount = this.tokenCache.get(token) || []
    const recentTokens = tokenCount.filter(timestamp => timestamp > windowStart)

    if (recentTokens.length >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: windowStart + 60000,
      }
    }

    recentTokens.push(now)
    this.tokenCache.set(token, recentTokens)

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - recentTokens.length,
      reset: windowStart + 60000,
    }
  }
}

// Create rate limiters for different endpoints
export const rateLimiters = {
  auth: new RateLimiter({ uniqueTokenPerInterval: 100, interval: 60000 }),
  api: new RateLimiter({ uniqueTokenPerInterval: 1000, interval: 60000 }),
  teamLead: new RateLimiter({ uniqueTokenPerInterval: 200, interval: 60000 }),
  projectManager: new RateLimiter({ uniqueTokenPerInterval: 200, interval: 60000 }),
}

// Rate limit middleware for API routes
export function createRateLimitMiddleware(limiter: RateLimiter, maxRequests: number = 10) {
  return function rateLimitMiddleware(token: string): RateLimitResult {
    return limiter.check(token, maxRequests)
  }
}

// Get client IP or user ID for rate limiting
export function getRateLimitToken(request: Request): string {
  // Try to get from headers first (for API routes)
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '')
  }

  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  return ip
}
