interface PerformanceMetrics {
  endpoint: string
  method: string
  duration: number
  timestamp: number
  userId?: string
  statusCode: number
  cacheHit?: boolean
  databaseQueries?: number
  slowQueries?: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private maxMetrics = 1000 // Keep last 1000 metrics

  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric)
    
    // Keep only the last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
    
    // Log slow requests (over 1 second)
    if (metric.duration > 1000) {
      console.warn('Slow API request:', {
        endpoint: metric.endpoint,
        method: metric.method,
        duration: metric.duration,
        userId: metric.userId,
        statusCode: metric.statusCode,
        cacheHit: metric.cacheHit,
        databaseQueries: metric.databaseQueries,
        slowQueries: metric.slowQueries
      })
    }
  }

  getMetrics() {
    return this.metrics
  }

  getAverageResponseTime(endpoint?: string): number {
    const filtered = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics
    
    if (filtered.length === 0) return 0
    
    const total = filtered.reduce((sum, m) => sum + m.duration, 0)
    return total / filtered.length
  }

  getSlowestEndpoints(limit: number = 10): Array<{ endpoint: string; avgDuration: number; count: number }> {
    const endpointStats = new Map<string, { total: number; count: number }>()
    
    this.metrics.forEach(metric => {
      const existing = endpointStats.get(metric.endpoint) || { total: 0, count: 0 }
      existing.total += metric.duration
      existing.count += 1
      endpointStats.set(metric.endpoint, existing)
    })
    
    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgDuration: stats.total / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit)
  }

  getCacheHitRate(): number {
    const withCache = this.metrics.filter(m => m.cacheHit !== undefined)
    if (withCache.length === 0) return 0
    
    const hits = withCache.filter(m => m.cacheHit).length
    return (hits / withCache.length) * 100
  }

  clear() {
    this.metrics = []
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Performance middleware for API routes
export function withPerformanceMonitoring<T>(
  endpoint: string,
  method: string,
  userId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  
  return fn().then((result) => {
    const duration = Date.now() - start
    
    performanceMonitor.recordMetric({
      endpoint,
      method,
      duration,
      timestamp: Date.now(),
      userId,
      statusCode: 200, // Assuming success for now
    })
    
    return result
  }).catch((error) => {
    const duration = Date.now() - start
    
    performanceMonitor.recordMetric({
      endpoint,
      method,
      duration,
      timestamp: Date.now(),
      userId,
      statusCode: error.status || 500,
    })
    
    throw error
  })
}

// Database query performance tracking
export function trackDatabaseQuery<T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  
  return fn().then((result) => {
    const duration = Date.now() - start
    
    if (duration > 100) {
      console.log('Database query performance:', {
        query: queryName,
        duration,
        timestamp: new Date().toISOString()
      })
    }
    
    return result
  })
}

// Cache performance tracking
export function trackCacheOperation<T>(
  operation: 'hit' | 'miss' | 'set',
  cacheKey: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  
  return fn().then((result) => {
    const duration = Date.now() - start
    
    if (duration > 50) {
      console.log('Cache operation performance:', {
        operation,
        cacheKey,
        duration,
        timestamp: new Date().toISOString()
      })
    }
    
    return result
  })
}
