"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

interface TeamEventsState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastUpdate: string | null
  members: any[]
  stats: any | null
}

export function useTeamEvents(teamId: string | null) {
  const [state, setState] = useState<TeamEventsState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastUpdate: null,
    members: [],
    stats: null,
  })

  const esRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (!teamId || esRef.current) return
    setState(prev => ({ ...prev, isConnecting: true, error: null }))
    const es = new EventSource(`/api/team-lead/events?teamId=${teamId}`)
    esRef.current = es

    es.onopen = () => setState(prev => ({ ...prev, isConnected: true, isConnecting: false }))
    es.addEventListener('team', (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data)
        setState(prev => ({ ...prev, members: data.members || [], stats: data.stats || null, lastUpdate: new Date().toISOString() }))
      } catch {}
    })
    es.addEventListener('error', () => {
      setState(prev => ({ ...prev, isConnected: false, isConnecting: false, error: 'Connection error' }))
      disconnect()
    })
  }, [teamId])

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { ...state, connect, disconnect }
}
