# Server-Sent Events (SSE) Implementation

## Overview

The admin dashboard now uses Server-Sent Events (SSE) for real-time updates instead of frequent page reloads. This provides a much more efficient and responsive user experience.

## Architecture

### 1. SSE Endpoint (`/api/dashboard/events`)
- **Location**: `app/api/dashboard/events/route.ts`
- **Purpose**: Provides real-time dashboard data updates
- **Features**:
  - Initial data load on connection
  - Periodic updates every 10 seconds
  - Heartbeat messages every 30 seconds
  - Automatic cleanup on disconnect

### 2. Custom Hook (`useDashboardEvents`)
- **Location**: `lib/hooks/use-dashboard-events.ts`
- **Purpose**: Manages SSE connection and state
- **Features**:
  - Automatic connection management
  - Exponential backoff reconnection
  - Error handling and recovery
  - State synchronization

### 3. Connection Status Component
- **Location**: `components/ui/connection-status.tsx`
- **Purpose**: Visual indicator of SSE connection status
- **Features**:
  - Real-time connection status
  - Last update timestamp
  - Manual reconnect button
  - Error display

## How It Works

### Connection Flow
1. Admin dashboard loads
2. `useDashboardEvents` hook initializes
3. SSE connection established to `/api/dashboard/events`
4. Initial dashboard data sent immediately
5. Periodic updates sent every 10 seconds
6. Heartbeat messages sent every 30 seconds

### Data Flow
1. **Initial Data**: Complete dashboard stats and recent data
2. **Updates**: Incremental updates for employees, shifts, requests
3. **Heartbeat**: Connection health check
4. **Error Handling**: Automatic reconnection with exponential backoff

### Reconnection Strategy
- **Max Attempts**: 5 reconnection attempts
- **Backoff**: Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max)
- **Auto-reconnect**: Automatic reconnection after 5 seconds of disconnection

## Benefits

### Performance
- **Reduced Server Load**: No more frequent full page reloads
- **Lower Bandwidth**: Only changed data is transmitted
- **Better Responsiveness**: Real-time updates without page refresh

### User Experience
- **Live Updates**: Dashboard updates automatically
- **Connection Status**: Visual feedback on connection health
- **Seamless Experience**: No interruption during updates

### Reliability
- **Automatic Recovery**: Handles connection drops gracefully
- **Error Handling**: Comprehensive error management
- **Fallback**: Falls back to manual refresh if SSE fails

## Usage

### In Components
```typescript
import { useDashboardEvents } from '@/lib/hooks/use-dashboard-events'
import { ConnectionStatus } from '@/components/ui/connection-status'

function AdminDashboard() {
  const {
    stats,
    data,
    isConnected,
    isConnecting,
    error,
    lastUpdate,
    reconnect
  } = useDashboardEvents(adminId)

  return (
    <div>
      <ConnectionStatus
        isConnected={isConnected}
        isConnecting={isConnecting}
        error={error}
        lastUpdate={lastUpdate}
        onReconnect={reconnect}
      />
      {/* Dashboard content */}
    </div>
  )
}
```

### Testing
```bash
# Test SSE connection
node scripts/test-sse.js

# Test with curl
curl -N http://localhost:3000/api/dashboard/events?adminId=test-admin
```

## Configuration

### Update Intervals
- **Dashboard Updates**: 10 seconds
- **Heartbeat**: 30 seconds
- **Reconnection Delay**: 5 seconds
- **Max Reconnection Attempts**: 5

### Event Types
- `dashboard`: Dashboard data updates
- `heartbeat`: Connection health check
- `error`: Error messages

## Monitoring

### Console Logs
- `🔄 Dashboard SSE connected`: Connection established
- `📊 Dashboard update received`: Data update received
- `💓 Dashboard heartbeat`: Heartbeat received
- `❌ Dashboard SSE error`: Connection error

### Browser DevTools
- **Network Tab**: Monitor SSE connection
- **Console**: View connection logs
- **Performance**: Monitor connection health

## Troubleshooting

### Common Issues

1. **Connection Fails**
   - Check server is running
   - Verify admin ID is valid
   - Check network connectivity

2. **No Updates Received**
   - Check database connectivity
   - Verify query permissions
   - Check console for errors

3. **Frequent Reconnections**
   - Check network stability
   - Verify server performance
   - Check for firewall issues

### Debug Mode
Enable detailed logging by setting `NODE_ENV=development` in your environment.

## Future Enhancements

1. **WebSocket Support**: For bi-directional communication
2. **Message Queuing**: For reliable message delivery
3. **Compression**: For reduced bandwidth usage
4. **Authentication**: Enhanced security for SSE connections
5. **Rate Limiting**: Prevent abuse of SSE endpoints
