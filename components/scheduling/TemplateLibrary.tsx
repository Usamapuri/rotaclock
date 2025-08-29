"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Clock, Palette, Settings, Plus, Search, Filter, Edit, Trash2, Copy, MoreHorizontal } from 'lucide-react'

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
}

interface TemplateLibraryProps {
  isOpen: boolean
  onClose: () => void
  templates: ShiftTemplate[]
  onTemplateEdit: (template: ShiftTemplate) => void
  onTemplateSaved: () => void
}

const DEPARTMENTS = [
  'General',
  'Sales',
  'Support',
  'Marketing',
  'IT',
  'HR',
  'Operations'
]

const COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' }
]

export default function TemplateLibrary({
  isOpen,
  onClose,
  templates,
  onTemplateEdit,
  onTemplateSaved
}: TemplateLibraryProps) {
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = !search || 
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.description?.toLowerCase().includes(search.toLowerCase())
    
    const matchesDepartment = departmentFilter === 'all' || template.department === departmentFilter
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && template.is_active !== false) ||
      (statusFilter === 'inactive' && template.is_active === false)
    
    return matchesSearch && matchesDepartment && matchesStatus
  })

  const handleToggleActive = async (templateId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/scheduling/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      })
      
      if (res.ok) {
        onTemplateSaved()
      }
    } catch (error) {
      console.error('Error toggling template status:', error)
    }
  }

  const handleDuplicate = async (template: ShiftTemplate) => {
    try {
      const duplicateTemplate = {
        ...template,
        name: `${template.name} (Copy)`,
        id: undefined
      }
      
      const res = await fetch('/api/scheduling/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateTemplate)
      })
      
      if (res.ok) {
        onTemplateSaved()
      }
    } catch (error) {
      console.error('Error duplicating template:', error)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    try {
      const res = await fetch(`/api/scheduling/templates/${templateId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        onTemplateSaved()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const getDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    return `${diffHours}h`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Template Library
          </DialogTitle>
          <DialogDescription>
            Manage your shift templates. Create, edit, and organize templates for quick scheduling.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Filters and Search */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="pl-9"
              />
            </div>
            
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={() => {
                onClose()
                onTemplateEdit({} as ShiftTemplate)
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-center">
                <div>
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                  <p className="text-gray-600 mb-4">
                    {search || departmentFilter !== 'all' || statusFilter !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Create your first template to get started'
                    }
                  </p>
                  {!search && departmentFilter === 'all' && statusFilter === 'all' && (
                    <Button 
                      onClick={() => {
                        onClose()
                        onTemplateEdit({} as ShiftTemplate)
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: template.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{template.name}</CardTitle>
                            <p className="text-sm text-gray-600 truncate">
                              {template.department}
                            </p>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onTemplateEdit(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleActive(template.id, template.is_active !== false)}
                              className={template.is_active !== false ? 'text-orange-600' : 'text-green-600'}
                            >
                              {template.is_active !== false ? (
                                <>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(template.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {template.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">
                              {template.start_time} - {template.end_time}
                            </span>
                            <span className="text-gray-500">
                              ({getDuration(template.start_time, template.end_time)})
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {template.required_staff} staff
                            </Badge>
                            {template.hourly_rate && (
                              <Badge variant="outline" className="text-xs">
                                £{template.hourly_rate}/hr
                              </Badge>
                            )}
                          </div>
                          
                          <Badge 
                            variant={template.is_active !== false ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {template.is_active !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t mt-6">
            <p className="text-sm text-gray-600">
              {filteredTemplates.length} of {templates.length} templates
            </p>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
