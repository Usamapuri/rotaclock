"use client"

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastUpdate: string | null
  onReconnect: () => void
  className?: string
}

export function ConnectionStatus({
  isConnected,
  isConnecting,
  error,
  lastUpdate,
  onReconnect,
  className = ""
}: ConnectionStatusProps) {
  const getStatusIcon = () => {
    if (isConnecting) {
      return <RefreshCw className="h-3 w-3 animate-spin" />
    }
    if (isConnected) {
      return <CheckCircle className="h-3 w-3" />
    }
    if (error) {
      return <AlertCircle className="h-3 w-3" />
    }
    return <WifiOff className="h-3 w-3" />
  }

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...'
    if (isConnected) return 'Live'
    if (error) return 'Error'
    return 'Disconnected'
  }

  const getStatusVariant = () => {
    if (isConnecting) return 'secondary'
    if (isConnected) return 'default'
    if (error) return 'destructive'
    return 'outline'
  }

  const getStatusColor = () => {
    if (isConnecting) return 'text-yellow-600'
    if (isConnected) return 'text-green-600'
    if (error) return 'text-red-600'
    return 'text-gray-600'
  }

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    return date.toLocaleTimeString()
  }

  const handleReconnect = () => {
    onReconnect()
    toast.success('Attempting to reconnect...')
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge variant={getStatusVariant()} className="flex items-center space-x-1">
        {getStatusIcon()}
        <span className={getStatusColor()}>{getStatusText()}</span>
      </Badge>
      
      {lastUpdate && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>Updated {formatLastUpdate(lastUpdate)}</span>
        </div>
      )}
      
      {!isConnected && !isConnecting && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReconnect}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reconnect
        </Button>
      )}
      
      {error && (
        <div className="text-xs text-red-600 max-w-xs truncate" title={error}>
          {error}
        </div>
      )}
    </div>
  )
}
