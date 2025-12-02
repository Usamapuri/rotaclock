"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { addDays, format, startOfWeek } from "date-fns"

interface CreateRotaModalProps {
    isOpen: boolean
    onClose: () => void
    onRotaCreated: (rotaId: string) => void
}

export default function CreateRotaModal({
    isOpen,
    onClose,
    onRotaCreated
}: CreateRotaModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        week_start_date: ''
    })

    // Helper to get next Monday
    const getNextMonday = () => {
        const today = new Date()
        const nextMonday = startOfWeek(addDays(today, 7), { weekStartsOn: 1 })
        return format(nextMonday, 'yyyy-MM-dd')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            setIsLoading(true)
            const response = await fetch('/api/rotas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create rota')
            }

            toast.success('Rota created successfully')
            onRotaCreated(data.data.id)
            onClose()
            setFormData({ name: '', description: '', week_start_date: '' })
        } catch (error: any) {
            console.error('Error creating rota:', error)
            toast.error(error.message || 'Failed to create rota')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Rota</DialogTitle>
                    <DialogDescription>
                        Create a new rota schedule for your team.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Rota Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Week 1 Schedule"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="week_start">Week Start Date (Monday)</Label>
                        <Input
                            id="week_start"
                            type="date"
                            value={formData.week_start_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, week_start_date: e.target.value }))}
                            required
                        />
                        <p className="text-xs text-gray-500 cursor-pointer hover:text-blue-600" onClick={() => setFormData(prev => ({ ...prev, week_start_date: getNextMonday() }))}>
                            Set to next Monday
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Notes about this rota..."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                            Create Rota
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
