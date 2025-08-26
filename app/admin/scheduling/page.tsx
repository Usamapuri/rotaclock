"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/lib/auth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Plus, RefreshCw, Settings, Users } from 'lucide-react'

import WeekGrid from '@/components/scheduling/WeekGrid'
import EmployeeList from '@/components/scheduling/EmployeeList'
import ShiftAssignmentModal from '@/components/scheduling/ShiftAssignmentModal'
import ShiftTemplateModal from '@/components/scheduling/ShiftTemplateModal'

interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  email: string
  department: string
  job_position: string
  assignments: { [date: string]: any[] }
}

interface ShiftTemplate {
  id: string
  name: string
  start_time: string
  end_time: string
  department: string
  color: string
  required_staff: number
}

export default function SchedulingPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null)
  const [assignmentEmployeeId, setAssignmentEmployeeId] = useState('')
  const [assignmentDate, setAssignmentDate] = useState('')

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'admin') {
      router.push('/admin/login')
      return
    }
    setCurrentUser(user)
    loadAll()
  }, [router])

  const loadAll = async () => {
    try {
      setIsLoading(true)
      // Load week first and use its employee list (already includes assignments)
      await loadWeek()
      await loadTemplates()
    } catch (e) {
      console.error(e)
      toast.error('Failed to load scheduling data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadEmployees = async () => {
    const res = await fetch('/api/scheduling/employees')
    const data = await res.json()
    if (data.success) {
      setEmployees(
        data.data.map((e: any) => ({ ...e, assignments: {} }))
      )
    }
  }

  const loadTemplates = async () => {
    const res = await fetch('/api/scheduling/templates')
    const data = await res.json()
    if (data.success) setTemplates(data.data)
  }

  const loadWeek = async (dateOverride?: string) => {
    const dateToLoad = dateOverride || selectedDate
    const res = await fetch(`/api/scheduling/week/${dateToLoad}`)
    const data = await res.json()
    if (!data.success) return
    // Always use employees from week payload to avoid stale or partial merges
    setEmployees(data.data.employees.map((e: any) => ({ ...e, assignments: e.assignments || {} })))
  }

  const handleDateChange = async (date: string) => {
    setSelectedDate(date)
    await loadWeek(date)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadAll()
    setIsRefreshing(false)
  }

  const handleAssignShift = (employeeId: string, date: string) => {
    setAssignmentEmployeeId(employeeId)
    setAssignmentDate(date)
    setShowAssignmentModal(true)
  }

  const handleAssignmentCreated = async () => {
    await loadWeek()
    toast.success('Shift saved')
  }

  const stats = useMemo(() => {
    let totalAssignments = 0
    let assignedEmployees = 0
    employees.forEach(e => {
      Object.values(e.assignments || {}).forEach((d: any) => (totalAssignments += d.length))
      if (Object.values(e.assignments || {}).some((d: any) => d.length > 0)) assignedEmployees += 1
    })
    return {
      totalEmployees: employees.length,
      assignedEmployees,
      totalAssignments,
      coverageRate: employees.length ? Math.round((assignedEmployees / employees.length) * 100) : 0,
    }
  }, [employees])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading scheduling...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduling</h1>
          <p className="text-gray-600">Plan and manage weekly shifts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => { setEditingTemplate(null); setShowTemplateModal(true) }}>
            <Settings className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => {
            setAssignmentDate(selectedDate)
            const defaultEmpId = selectedEmployee?.id || employees[0]?.id || ''
            setAssignmentEmployeeId(defaultEmpId)
            setShowAssignmentModal(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Quick Assign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">Total Employees</p><p className="text-2xl font-bold">{stats.totalEmployees}</p></div><Users className="h-8 w-8 text-blue-500"/></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">Assigned Employees</p><p className="text-2xl font-bold">{stats.assignedEmployees}</p></div><Calendar className="h-8 w-8 text-green-500"/></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">Total Assignments</p><p className="text-2xl font-bold">{stats.totalAssignments}</p></div><Settings className="h-8 w-8 text-purple-500"/></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">Coverage Rate</p><p className="text-2xl font-bold">{stats.coverageRate}%</p></div><div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">%</div></CardContent></Card>
      </div>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">Week Schedule</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="templates">Shift Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule" className="space-y-4">
          <WeekGrid
            employees={employees}
            templates={templates}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onAssignShift={handleAssignShift}
            onRemoveShift={(assignmentId: string) => {
              // Optimistically remove from local state; API deletion happens inside ShiftCell
              setEmployees(prev => prev.map(e => {
                const updatedAssignments: any = {}
                Object.entries(e.assignments || {}).forEach(([d, arr]) => {
                  updatedAssignments[d] = (arr as any[]).filter(a => a.id !== assignmentId)
                })
                return { ...e, assignments: updatedAssignments }
              }))
            }}
            onAssignmentCreated={handleAssignmentCreated}
          />
        </TabsContent>
        <TabsContent value="employees" className="space-y-4">
          <EmployeeList selectedEmployeeId={selectedEmployee?.id} onEmployeeSelect={e => setSelectedEmployee({
            id: e.id,
            employee_code: e.employee_code,
            first_name: e.first_name,
            last_name: e.last_name,
            email: e.email,
            department: e.department,
            job_position: e.job_position,
            assignments: {}
          })} />
        </TabsContent>
        <TabsContent value="templates" className="space-y-4">
          {/* Template list is already accessible via modal; keep page minimal for now */}
        </TabsContent>
      </Tabs>

      <ShiftAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        employee={employees.find(e => e.id === assignmentEmployeeId) || null}
        date={assignmentDate}
        templates={templates}
        onAssignmentCreated={handleAssignmentCreated}
      />

      <ShiftTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        template={editingTemplate}
        onTemplateSaved={async () => { await loadTemplates(); toast.success('Template saved') }}
      />
    </div>
  )
}


