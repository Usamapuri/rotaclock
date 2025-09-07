"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Clock, Palette, Settings, Plus, Search, Filter, Edit, Trash2, Copy, MoreHorizontal, Star, Zap, Users } from 'lucide-react'
import { AuthService } from '@/lib/auth'
import { toast } from 'sonner'

interface ShiftTemplate {
  id: string
  name: string
  description?: string
  start_time: string
  end_time: string
  department: string
  required_staff: number
  hourly_rate?: number
  color: string
  is_active?: boolean
  usage_count?: number
  is_favorite?: boolean
}

interface TemplatePattern {
  id: string
  name: string
  description: string
  templates: Omit<ShiftTemplate, 'id'>[]
  category: 'retail' | 'healthcare' | 'hospitality' | 'office' | 'custom'
}

interface EnhancedTemplateLibraryProps {
  templates: ShiftTemplate[]
  onTemplateEdit: (template: ShiftTemplate) => void
  onTemplateSaved: () => void
}

const COMMON_PATTERNS: TemplatePattern[] = [
  {
    id: 'retail-standard',
    name: 'Standard Retail',
    description: 'Common retail shifts with opening, mid-day, and closing coverage',
    category: 'retail',
    templates: [
      {
        name: 'Opening Shift',
        description: 'Store opening and morning rush',
        start_time: '08:00',
        end_time: '14:00',
        department: 'Sales',
        required_staff: 2,
        hourly_rate: 15.00,
        color: '#3B82F6',
        is_active: true
      },
      {
        name: 'Mid-Day Shift',
        description: 'Afternoon coverage',
        start_time: '12:00',
        end_time: '18:00',
        department: 'Sales',
        required_staff: 3,
        hourly_rate: 15.00,
        color: '#10B981',
        is_active: true
      },
      {
        name: 'Closing Shift',
        description: 'Evening and store closing',
        start_time: '16:00',
        end_time: '22:00',
        department: 'Sales',
        required_staff: 2,
        hourly_rate: 16.00,
        color: '#F59E0B',
        is_active: true
      }
    ]
  },
  {
    id: 'office-standard',
    name: 'Standard Office Hours',
    description: 'Traditional office shifts with flexible timing',
    category: 'office',
    templates: [
      {
        name: 'Early Bird',
        description: 'Early start for productivity',
        start_time: '07:00',
        end_time: '15:00',
        department: 'General',
        required_staff: 1,
        hourly_rate: 20.00,
        color: '#8B5CF6',
        is_active: true
      },
      {
        name: 'Standard Hours',
        description: 'Regular 9-to-5 shift',
        start_time: '09:00',
        end_time: '17:00',
        department: 'General',
        required_staff: 1,
        hourly_rate: 20.00,
        color: '#3B82F6',
        is_active: true
      },
      {
        name: 'Late Shift',
        description: 'Later start for work-life balance',
        start_time: '10:00',
        end_time: '18:00',
        department: 'General',
        required_staff: 1,
        hourly_rate: 20.00,
        color: '#06B6D4',
        is_active: true
      }
    ]
  },
  {
    id: 'customer-support',
    name: 'Customer Support Coverage',
    description: '24/7 customer support with overlapping shifts',
    category: 'office',
    templates: [
      {
        name: 'Morning Support',
        description: 'Early customer inquiries',
        start_time: '06:00',
        end_time: '14:00',
        department: 'Support',
        required_staff: 2,
        hourly_rate: 18.00,
        color: '#10B981',
        is_active: true
      },
      {
        name: 'Day Support',
        description: 'Peak hours coverage',
        start_time: '10:00',
        end_time: '18:00',
        department: 'Support',
        required_staff: 4,
        hourly_rate: 18.00,
        color: '#3B82F6',
        is_active: true
      },
      {
        name: 'Evening Support',
        description: 'After-hours support',
        start_time: '14:00',
        end_time: '22:00',
        department: 'Support',
        required_staff: 2,
        hourly_rate: 19.00,
        color: '#F59E0B',
        is_active: true
      },
      {
        name: 'Night Support',
        description: 'Overnight emergency support',
        start_time: '22:00',
        end_time: '06:00',
        department: 'Support',
        required_staff: 1,
        hourly_rate: 22.00,
        color: '#6B7280',
        is_active: true
      }
    ]
  }
]

const DEPARTMENTS = [
  'General',
  'Sales',
  'Support',
  'Marketing',
  'Operations',
  'Management',
  'Security',
  'Cleaning'
]

const TEMPLATE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
]

export default function EnhancedTemplateLibrary({ templates, onTemplateEdit, onTemplateSaved }: EnhancedTemplateLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [showPatternDialog, setShowPatternDialog] = useState(false)
  const [selectedPattern, setSelectedPattern] = useState<TemplatePattern | null>(null)
  const [isApplyingPattern, setIsApplyingPattern] = useState(false)

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = selectedDepartment === 'all' || template.department === selectedDepartment
    return matchesSearch && matchesDepartment && template.is_active !== false
  })

  const favoriteTemplates = filteredTemplates.filter(t => t.is_favorite)
  const popularTemplates = filteredTemplates.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)).slice(0, 6)

  const applyPattern = async (pattern: TemplatePattern) => {
    try {
      setIsApplyingPattern(true)
      const user = AuthService.getCurrentUser()
      
      for (const templateData of pattern.templates) {
        const response = await fetch('/api/scheduling/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${user?.id}`
          },
          body: JSON.stringify(templateData)
        })
        
        if (!response.ok) {
          throw new Error('Failed to create template')
        }
      }
      
      toast.success(`Applied ${pattern.name} pattern (${pattern.templates.length} templates)`)
      onTemplateSaved()
      setShowPatternDialog(false)
      setSelectedPattern(null)
    } catch (error) {
      console.error('Error applying pattern:', error)
      toast.error('Failed to apply pattern')
    } finally {
      setIsApplyingPattern(false)
    }
  }

  const toggleFavorite = async (template: ShiftTemplate) => {
    try {
      const user = AuthService.getCurrentUser()
      const response = await fetch(`/api/scheduling/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${user?.id}`
        },
        body: JSON.stringify({
          ...template,
          is_favorite: !template.is_favorite
        })
      })
      
      if (response.ok) {
        toast.success(template.is_favorite ? 'Removed from favorites' : 'Added to favorites')
        onTemplateSaved()
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite status')
    }
  }

  const duplicateTemplate = async (template: ShiftTemplate) => {
    try {
      const user = AuthService.getCurrentUser()
      const duplicatedTemplate = {
        ...template,
        name: `${template.name} (Copy)`,
        id: undefined
      }
      delete duplicatedTemplate.id
      
      const response = await fetch('/api/scheduling/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${user?.id}`
        },
        body: JSON.stringify(duplicatedTemplate)
      })
      
      if (response.ok) {
        toast.success('Template duplicated successfully')
        onTemplateSaved()
      }
    } catch (error) {
      console.error('Error duplicating template:', error)
      toast.error('Failed to duplicate template')
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`1970-01-01T${startTime}:00`)
    const end = new Date(`1970-01-01T${endTime}:00`)
    const diff = end.getTime() - start.getTime()
    const hours = diff / (1000 * 60 * 60)
    return `${hours}h`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Shift Templates</h2>
          <p className="text-gray-500">Manage and organize your shift templates</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPatternDialog(true)}
          >
            <Zap className="h-4 w-4 mr-2" />
            Quick Patterns
          </Button>
          <Button onClick={() => onTemplateEdit({} as ShiftTemplate)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Sections */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Templates ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="h-4 w-4 mr-1" />
            Favorites ({favoriteTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="popular">
            <Users className="h-4 w-4 mr-1" />
            Most Used
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TemplateGrid 
            templates={filteredTemplates}
            onEdit={onTemplateEdit}
            onToggleFavorite={toggleFavorite}
            onDuplicate={duplicateTemplate}
          />
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          {favoriteTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Favorite Templates</h3>
              <p className="text-gray-500">Mark templates as favorites for quick access</p>
            </div>
          ) : (
            <TemplateGrid 
              templates={favoriteTemplates}
              onEdit={onTemplateEdit}
              onToggleFavorite={toggleFavorite}
              onDuplicate={duplicateTemplate}
            />
          )}
        </TabsContent>

        <TabsContent value="popular" className="space-y-4">
          <TemplateGrid 
            templates={popularTemplates}
            onEdit={onTemplateEdit}
            onToggleFavorite={toggleFavorite}
            onDuplicate={duplicateTemplate}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Patterns Dialog */}
      <Dialog open={showPatternDialog} onOpenChange={setShowPatternDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Patterns</DialogTitle>
            <DialogDescription>
              Apply pre-built template patterns to quickly set up common shift structures
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {COMMON_PATTERNS.map((pattern) => (
              <Card key={pattern.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{pattern.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {pattern.templates.length} templates
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{pattern.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 mb-4">
                    {pattern.templates.slice(0, 3).map((template, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-gray-500">
                          {formatTime(template.start_time)} - {formatTime(template.end_time)}
                        </span>
                      </div>
                    ))}
                    {pattern.templates.length > 3 && (
                      <div className="text-xs text-gray-400">
                        +{pattern.templates.length - 3} more templates
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => {
                      setSelectedPattern(pattern)
                      applyPattern(pattern)
                    }}
                    disabled={isApplyingPattern && selectedPattern?.id === pattern.id}
                  >
                    {isApplyingPattern && selectedPattern?.id === pattern.id ? (
                      'Applying...'
                    ) : (
                      'Apply Pattern'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  function TemplateGrid({ templates, onEdit, onToggleFavorite, onDuplicate }: {
    templates: ShiftTemplate[]
    onEdit: (template: ShiftTemplate) => void
    onToggleFavorite: (template: ShiftTemplate) => void
    onDuplicate: (template: ShiftTemplate) => void
  }) {
    if (templates.length === 0) {
      return (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
          <p className="text-gray-500">Create your first shift template to get started</p>
        </div>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: template.color }}
                  />
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {template.is_favorite && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(template)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleFavorite(template)}>
                      <Star className="h-4 w-4 mr-2" />
                      {template.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(template)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {template.description && (
                <p className="text-sm text-gray-500">{template.description}</p>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">
                    {formatTime(template.start_time)} - {formatTime(template.end_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span>{calculateDuration(template.start_time, template.end_time)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Department:</span>
                  <Badge variant="outline" className="text-xs">{template.department}</Badge>
                </div>
                {template.usage_count && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Used:</span>
                    <span className="text-xs text-gray-500">{template.usage_count} times</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
}
