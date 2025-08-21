import { LRUCache } from 'lru-cache'

// Cache configuration
const cacheOptions = {
  max: 500, // Maximum number of items
  ttl: 1000 * 60 * 5, // 5 minutes TTL
  updateAgeOnGet: true,
  allowStale: true,
}

// Create separate caches for different types of data
export const userCache = new LRUCache<string, any>(cacheOptions)
export const teamCache = new LRUCache<string, any>(cacheOptions)
export const requestCache = new LRUCache<string, any>(cacheOptions)
export const reportCache = new LRUCache<string, any>(cacheOptions)

// Cache keys generator
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  team: (id: string) => `team:${id}`,
  teamMembers: (teamId: string) => `team_members:${teamId}`,
  teamRequests: (teamLeadId: string, filters?: string) => `team_requests:${teamLeadId}:${filters || 'all'}`,
  leaveRequests: (teamId: string, filters?: string) => `leave_requests:${teamId}:${filters || 'all'}`,
  swapRequests: (teamId: string, filters?: string) => `swap_requests:${teamId}:${filters || 'all'}`,
  meetingNotes: (teamId: string, filters?: string) => `meeting_notes:${teamId}:${filters || 'all'}`,
  teamReports: (pmId: string, filters?: string) => `team_reports:${pmId}:${filters || 'all'}`,
  managedTeams: (pmId: string) => `managed_teams:${pmId}`,
}

// Cache invalidation functions
export const invalidateCache = {
  user: (id: string) => userCache.delete(cacheKeys.user(id)),
  team: (id: string) => {
    teamCache.delete(cacheKeys.team(id))
    // Also invalidate related caches
    teamCache.delete(cacheKeys.teamMembers(id))
  },
  teamRequests: (teamLeadId: string) => {
    requestCache.clear() // Clear all team requests cache
  },
  leaveRequests: (teamId: string) => {
    requestCache.clear() // Clear all leave requests cache
  },
  swapRequests: (teamId: string) => {
    requestCache.clear() // Clear all swap requests cache
  },
  meetingNotes: (teamId: string) => {
    requestCache.clear() // Clear all meeting notes cache
  },
  teamReports: (pmId: string) => {
    reportCache.clear() // Clear all team reports cache
  },
  managedTeams: (pmId: string) => {
    teamCache.delete(cacheKeys.managedTeams(pmId))
  },
}

// Cache wrapper function
export function withCache<T>(
  cache: LRUCache<string, T>,
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get(key)
  if (cached !== undefined) {
    return Promise.resolve(cached)
  }

  return fn().then((result) => {
    cache.set(key, result, { ttl })
    return result
  })
}

// Cache middleware for API routes
export function createCacheMiddleware(cache: LRUCache<string, any>) {
  return function cacheMiddleware<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    return withCache(cache, key, fn, ttl)
  }
}
