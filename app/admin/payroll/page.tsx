"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Download,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  BarChart3,
  Settings,
  Calculator,
  CreditCard,
  Receipt
} from "lucide-react"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"

interface PayrollPeriod {
  id: string
  period_name: string
  start_date: string
  end_date: string
  status: 'open' | 'processing' | 'closed' | 'paid'
  total_employees: number
  total_payroll_amount: number
  created_at: string
}

interface PayrollRecord {
  id: string
  employee_id: string
  employee_name: string
  payroll_period_id: string
  base_salary: number
  hours_worked: number
  hourly_pay: number
  overtime_hours: number
  overtime_pay: number
  bonus_amount: number
  deductions_amount: number
  gross_pay: number
  net_pay: number
  payment_status: 'pending' | 'paid' | 'cancelled'
  payment_date?: string
  payment_method?: string
  notes?: string
  created_at: string
}

interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  hourly_rate: number
}

export default function PayrollDashboard() {
  const router = useRouter()
  const [adminUser, setAdminUser] = useState("")
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([])
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [showCreatePeriodDialog, setShowCreatePeriodDialog] = useState(false)
  const [showAddDeductionDialog, setShowAddDeductionDialog] = useState(false)
  const [showAddBonusDialog, setShowAddBonusDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [deductionAmount, setDeductionAmount] = useState("")
  const [deductionReason, setDeductionReason] = useState("")
  const [bonusAmount, setBonusAmount] = useState("")
  const [bonusReason, setBonusReason] = useState("")
  const [newPeriodName, setNewPeriodName] = useState("")
  const [newPeriodStart, setNewPeriodStart] = useState("")
  const [newPeriodEnd, setNewPeriodEnd] = useState("")

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'admin') {
      router.push("/admin/login")
    } else {
      setAdminUser(user.email || 'Administrator')
      loadPayrollData()
    }
  }, [router])

  const loadPayrollData = async () => {
    setIsLoading(true)
    try {
      // Load payroll periods
      const periodsResponse = await fetch('/api/admin/payroll/periods')
      if (periodsResponse.ok) {
        const periodsData = await periodsResponse.json()
        setPayrollPeriods(periodsData)
        if (periodsData.length > 0 && !selectedPeriod) {
          setSelectedPeriod(periodsData[0].id)
        }
      }

      // Load employees
      const employeesResponse = await fetch('/api/employees')
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json()
        setEmployees(employeesData.data || employeesData || [])
      }

      // Load payroll records if period is selected
      if (selectedPeriod) {
        await loadPayrollRecords(selectedPeriod)
      }

    } catch (error) {
      console.error('Error loading payroll data:', error)
      toast.error('Failed to load payroll data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadPayrollRecords = async (periodId: string) => {
    try {
      const response = await fetch(`/api/admin/payroll/records?period_id=${periodId}`)
      if (response.ok) {
        const recordsData = await response.json()
        setPayrollRecords(recordsData)
      }
    } catch (error) {
      console.error('Error loading payroll records:', error)
      toast.error('Failed to load payroll records')
    }
  }

  useEffect(() => {
    if (selectedPeriod) {
      loadPayrollRecords(selectedPeriod)
    }
  }, [selectedPeriod])

  const handleCreatePeriod = async () => {
    if (!newPeriodName || !newPeriodStart || !newPeriodEnd) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      const response = await fetch('/api/admin/payroll/periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period_name: newPeriodName,
          start_date: newPeriodStart,
          end_date: newPeriodEnd,
        }),
      })

      if (response.ok) {
        toast.success('Payroll period created successfully')
        setShowCreatePeriodDialog(false)
        setNewPeriodName("")
        setNewPeriodStart("")
        setNewPeriodEnd("")
        loadPayrollData()
      } else {
        toast.error('Failed to create payroll period')
      }
    } catch (error) {
      console.error('Error creating payroll period:', error)
      toast.error('Failed to create payroll period')
    }
  }

  const handleCalculatePayroll = async () => {
    if (!selectedPeriod) {
      toast.error('Please select a payroll period')
      return
    }

    try {
      const response = await fetch(`/api/admin/payroll/calculate?period_id=${selectedPeriod}`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Payroll calculated successfully')
        loadPayrollRecords(selectedPeriod)
      } else {
        toast.error('Failed to calculate payroll')
      }
    } catch (error) {
      console.error('Error calculating payroll:', error)
      toast.error('Failed to calculate payroll')
    }
  }

  const handleAddDeduction = async () => {
    if (!selectedEmployee || !deductionAmount || !deductionReason) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      const response = await fetch('/api/admin/payroll/deductions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_email: selectedEmployee,
          payroll_period_id: selectedPeriod,
          amount: parseFloat(deductionAmount),
          reason: deductionReason,
          deduction_type: 'performance'
        }),
      })

      if (response.ok) {
        toast.success('Deduction added successfully')
        setShowAddDeductionDialog(false)
        setSelectedEmployee("")
        setDeductionAmount("")
        setDeductionReason("")
        loadPayrollRecords(selectedPeriod)
      } else {
        toast.error('Failed to add deduction')
      }
    } catch (error) {
      console.error('Error adding deduction:', error)
      toast.error('Failed to add deduction')
    }
  }

  const handleAddBonus = async () => {
    if (!selectedEmployee || !bonusAmount || !bonusReason) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      const response = await fetch('/api/admin/payroll/bonuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_email: selectedEmployee,
          payroll_period_id: selectedPeriod,
          amount: parseFloat(bonusAmount),
          reason: bonusReason,
          bonus_type: 'performance'
        }),
      })

      if (response.ok) {
        toast.success('Bonus added successfully')
        setShowAddBonusDialog(false)
        setSelectedEmployee("")
        setBonusAmount("")
        setBonusReason("")
        loadPayrollRecords(selectedPeriod)
      } else {
        toast.error('Failed to add bonus')
      }
    } catch (error) {
      console.error('Error adding bonus:', error)
      toast.error('Failed to add bonus')
    }
  }

  const handleExportPayroll = async () => {
    if (!selectedPeriod) {
      toast.error('Please select a payroll period')
      return
    }

    try {
      const response = await fetch(`/api/admin/payroll/export?period_id=${selectedPeriod}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payroll_${selectedPeriod}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Payroll data exported successfully')
      } else {
        toast.error('Failed to export payroll data')
      }
    } catch (error) {
      console.error('Error exporting payroll:', error)
      toast.error('Failed to export payroll data')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const calculateTotalPayroll = () => {
    return payrollRecords.reduce((total, record) => {
      const netPay = parseFloat(record.net_pay) || 0
      return total + netPay
    }, 0)
  }

  const calculateTotalDeductions = () => {
    return payrollRecords.reduce((total, record) => {
      const deductions = parseFloat(record.deductions_amount) || 0
      return total + deductions
    }, 0)
  }

  const calculateTotalBonuses = () => {
    return payrollRecords.reduce((total, record) => {
      const bonuses = parseFloat(record.bonus_amount) || 0
      return total + bonuses
    }, 0)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading payroll data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-gray-600">Manage employee payroll, deductions, and payments</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowCreatePeriodDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Period
          </Button>
          <Button variant="outline" onClick={handleExportPayroll}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payroll Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a payroll period" />
              </SelectTrigger>
              <SelectContent>
                {payrollPeriods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.period_name} ({formatDate(period.start_date)} - {formatDate(period.end_date)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCalculatePayroll} disabled={!selectedPeriod}>
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Payroll
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(calculateTotalPayroll())}</div>
            <p className="text-xs text-muted-foreground">
              {payrollRecords.length} employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(calculateTotalDeductions())}</div>
            <p className="text-xs text-muted-foreground">
              Performance & attendance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bonuses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotalBonuses())}</div>
            <p className="text-xs text-muted-foreground">
              Performance rewards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Periods</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollPeriods.filter(p => p.status === 'open').length}</div>
            <p className="text-xs text-muted-foreground">
              Open for processing
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="records" className="space-y-6">
        <TabsList>
          <TabsTrigger value="records">Payroll Records</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="periods">Periods</TabsTrigger>
        </TabsList>

        {/* Payroll Records Tab */}
        <TabsContent value="records" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payroll Records
              </CardTitle>
              <CardDescription>
                Employee payroll records for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Bonuses</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.employee_name}</div>
                          <div className="text-sm text-gray-500">{record.employee_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(record.base_salary)}</TableCell>
                      <TableCell>{record.hours_worked}h</TableCell>
                      <TableCell>{formatCurrency(record.overtime_pay)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(record.bonus_amount)}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(record.deductions_amount)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(record.net_pay)}</TableCell>
                      <TableCell>
                        <Badge variant={record.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {record.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Add Deduction
                </CardTitle>
                <CardDescription>
                  Add performance or attendance deductions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => setShowAddDeductionDialog(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deduction
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Add Bonus
                </CardTitle>
                <CardDescription>
                  Add performance or special bonuses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => setShowAddBonusDialog(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bonus
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Periods Tab */}
        <TabsContent value="periods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Payroll Periods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollPeriods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.period_name}</TableCell>
                      <TableCell>{formatDate(period.start_date)}</TableCell>
                      <TableCell>{formatDate(period.end_date)}</TableCell>
                      <TableCell>
                        <Badge variant={period.status === 'paid' ? 'default' : 'secondary'}>
                          {period.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{period.total_employees}</TableCell>
                      <TableCell>{formatCurrency(period.total_payroll_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Period Dialog */}
      <Dialog open={showCreatePeriodDialog} onOpenChange={setShowCreatePeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Payroll Period</DialogTitle>
            <DialogDescription>
              Create a new payroll period for processing employee payments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="period_name">Period Name</Label>
              <Input
                id="period_name"
                value={newPeriodName}
                onChange={(e) => setNewPeriodName(e.target.value)}
                placeholder="e.g., January 2024"
              />
            </div>
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={newPeriodStart}
                onChange={(e) => setNewPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={newPeriodEnd}
                onChange={(e) => setNewPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePeriodDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePeriod}>
              <Plus className="h-4 w-4 mr-2" />
              Create Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deduction Dialog */}
      <Dialog open={showAddDeductionDialog} onOpenChange={setShowAddDeductionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Deduction</DialogTitle>
            <DialogDescription>
              Add a deduction for poor performance or attendance issues.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="employee">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.email}>
                      {employee.first_name} {employee.last_name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deduction_amount">Amount (PKR)</Label>
              <Input
                id="deduction_amount"
                type="number"
                value={deductionAmount}
                onChange={(e) => setDeductionAmount(e.target.value)}
                placeholder="500"
              />
            </div>
            <div>
              <Label htmlFor="deduction_reason">Reason</Label>
              <Input
                id="deduction_reason"
                value={deductionReason}
                onChange={(e) => setDeductionReason(e.target.value)}
                placeholder="Poor performance, late arrival, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDeductionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDeduction}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Add Deduction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bonus Dialog */}
      <Dialog open={showAddBonusDialog} onOpenChange={setShowAddBonusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bonus</DialogTitle>
            <DialogDescription>
              Add a bonus for excellent performance or special achievements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bonus_employee">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.email}>
                      {employee.first_name} {employee.last_name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bonus_amount">Amount (PKR)</Label>
              <Input
                id="bonus_amount"
                type="number"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div>
              <Label htmlFor="bonus_reason">Reason</Label>
              <Input
                id="bonus_reason"
                value={bonusReason}
                onChange={(e) => setBonusReason(e.target.value)}
                placeholder="Excellent performance, special project, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBonusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBonus}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Add Bonus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
