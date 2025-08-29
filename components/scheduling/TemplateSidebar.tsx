"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Clock, Users, GripVertical } from 'lucide-react'

interface ShiftTemplate {
  id: string
  name: string
  start_time: string
  end_time: string
  department: string
  color: string
  required_staff: number
  is_active?: boolean
}

interface TemplateSidebarProps {
  templates: ShiftTemplate[]
  onDragStart: (template: ShiftTemplate) => void
  onTemplateClick?: (template: ShiftTemplate) => void
}

export default function TemplateSidebar({
  templates,
  onDragStart,
  onTemplateClick
}: TemplateSidebarProps) {
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = !search || 
      template.name.toLowerCase().includes(search.toLowerCase())
    
    const matchesDepartment = departmentFilter === 'all' || template.department === departmentFilter
    
    return matchesSearch && matchesDepartment && template.is_active !== false
  })

  const departments = Array.from(new Set(templates.map(t => t.department).filter(Boolean)))

  const handleDragStart = (e: React.DragEvent, template: ShiftTemplate) => {
    e.dataTransfer.setData('application/json', JSON.stringify(template))
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(template)
  }

  const getDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    return `${diffHours}h`
  }

  return (
    <Card className="h-full bg-white shadow-sm border-0">
      <CardContent className="p-4 h-full flex flex-col">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">Shift Templates</h3>
          <p className="text-sm text-gray-600 mb-3">
            Drag templates to assign shifts
          </p>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-1 mb-3">
            <Button
              variant={departmentFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDepartmentFilter('all')}
              className="text-xs"
            >
              All
            </Button>
            {departments.map(dept => (
              <Button
                key={dept}
                variant={departmentFilter === dept ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDepartmentFilter(dept)}
                className="text-xs"
              >
                {dept}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {search || departmentFilter !== 'all' 
                    ? 'No templates match your search' 
                    : 'No templates available'
                  }
                </p>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, template)}
                  onClick={() => onTemplateClick?.(template)}
                  className={`
                    p-3 border rounded-lg cursor-grab active:cursor-grabbing
                    hover:shadow-md transition-all duration-200
                    ${onTemplateClick ? 'hover:bg-gray-50' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: template.color }}
                        />
                        <h4 className="font-medium text-sm text-gray-900 truncate">
                          {template.name}
                        </h4>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>{template.start_time} - {template.end_time}</span>
                          <span className="text-gray-400">
                            ({getDuration(template.start_time, template.end_time)})
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {template.department}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Users className="h-3 w-3" />
                            <span>{template.required_staff}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-gray-500 text-center">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
