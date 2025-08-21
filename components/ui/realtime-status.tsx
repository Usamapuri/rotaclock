"use client"

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

interface RealtimeStatusProps {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastUpdate: string | null
  onReconnect: () => void
  className?: string
  showDetails?: boolean
}

export function RealtimeStatus({
  isConnected,
  isConnecting,
  error,
  lastUpdate,
  onReconnect,
  className = "",
  showDetails = false
}: RealtimeStatusProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const getStatusIcon = () => {
    if (isConnecting) {
      return <RefreshCw className="h-3 w-3 animate-spin" />
    }
    if (error) {
      return <AlertCircle className="h-3 w-3" />
    }
    if (isConnected) {
      return <CheckCircle className="h-3 w-3" />
    }
    return <WifiOff className="h-3 w-3" />
  }

  const getStatusText = () => {
    if (isConnecting) {
      return "Connecting..."
    }
    if (error) {
      return "Error"
    }
    if (isConnected) {
      return "Live"
    }
    return "Offline"
  }

  const getStatusColor = () => {
    if (isConnecting) {
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
    }
    if (error) {
      return "bg-red-100 text-red-800 hover:bg-red-200"
    }
    if (isConnected) {
      return "bg-green-100 text-green-800 hover:bg-green-200"
    }
    return "bg-gray-100 text-gray-800 hover:bg-gray-200"
  }

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else {
      return date.toLocaleTimeString()
    }
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1 cursor-pointer ${getStatusColor()}`}
              onClick={onReconnect}
            >
              {getStatusIcon()}
              <span className="text-xs font-medium">{getStatusText()}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div className="font-medium">Real-time Connection</div>
              <div className="text-gray-500">
                {isConnected ? "Connected to live updates" : 
                 isConnecting ? "Establishing connection..." :
                 error ? `Error: ${error}` : "Disconnected"}
              </div>
              {lastUpdate && (
                <div className="text-gray-500 mt-1">
                  Last update: {formatLastUpdate(lastUpdate)}
                </div>
              )}
              <div className="text-gray-400 mt-1">
                Click to reconnect
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {showDetails && (
          <div className="text-xs text-gray-500">
            {lastUpdate && (
              <span>Updated {formatLastUpdate(lastUpdate)}</span>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
