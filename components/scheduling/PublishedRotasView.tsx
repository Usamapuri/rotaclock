"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, Clock, Eye } from 'lucide-react'
import { AuthService } from '@/lib/auth'

interface PublishedRota {
  id: string
  name: string
  week_start_date: string
  status: string
  total_shifts: number
  total_employees: number
  published_at: string
  published_by_first_name?: string
  published_by_last_name?: string
}

interface PublishedRotasViewProps {
  onViewRota: (rotaId: string) => void
}

export default function PublishedRotasView({ onViewRota }: PublishedRotasViewProps) {
  const [publishedRotas, setPublishedRotas] = useState<PublishedRota[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPublishedRotas()
  }, [])

  const loadPublishedRotas = async () => {
    try {
      setIsLoading(true)
      const user = AuthService.getCurrentUser()
      const res = await fetch('/api/rotas?status=published', {
        headers: user?.id ? { authorization: `Bearer ${user.id}` } : {}
      })
      const data = await res.json()
      if (data.success) {
        setPublishedRotas(data.data)
      }
    } catch (error) {
      console.error('Error loading published rotas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getWeekRange = (weekStart: string) => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    
    return `${formatDate(weekStart)} - ${formatDate(end.toISOString().split('T')[0])}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading published rotas...</p>
        </div>
      </div>
    )
  }

  if (publishedRotas.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Published Rotas</h3>
        <p className="text-gray-500">Published rotas will appear here for historical reference</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Published Rotas</h2>
          <p className="text-gray-500">Historical view of all published rotas</p>
        </div>
        <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
          {publishedRotas.length} Published
        </Badge>
      </div>

      <div className="grid gap-4">
        {publishedRotas.map((rota) => (
          <Card key={rota.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{rota.name}</CardTitle>
                    <p className="text-sm text-gray-500">
                      {getWeekRange(rota.week_start_date)}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Published
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {rota.total_shifts} shifts
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {rota.total_employees} employees
                  </div>
                  <div>
                    Published {formatDate(rota.published_at)}
                    {rota.published_by_first_name && (
                      <span className="ml-1">
                        by {rota.published_by_first_name} {rota.published_by_last_name}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewRota(rota.id)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
