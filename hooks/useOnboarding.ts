"use client"

import { useState, useEffect } from "react"
import type { OnboardingTemplate, OnboardingProcess, OnboardingDocument, Employee } from "@/lib/supabase"

export function useOnboardingTemplates() {
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/onboarding/templates")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch templates")
      }

      setTemplates(data.templates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async (templateData: Partial<OnboardingTemplate>) => {
    try {
      const response = await fetch("/api/onboarding/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create template")
      }

      await fetchTemplates() // Refresh the list
      return data.template
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
  }
}

export function useOnboardingProcesses() {
  const [processes, setProcesses] = useState<OnboardingProcess[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProcesses = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/onboarding/processes")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch processes")
      }

      setProcesses(data.processes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const createProcess = async (processData: Partial<OnboardingProcess>) => {
    try {
      const response = await fetch("/api/onboarding/processes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create process")
      }

      await fetchProcesses() // Refresh the list
      return data.process
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const completeStep = async (processId: string, stepId: string, feedback?: string) => {
    try {
      const response = await fetch("/api/onboarding/steps/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          process_id: processId,
          step_id: stepId,
          feedback,
          completed_by: "current-user", // This should be the actual user ID
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete step")
      }

      await fetchProcesses() // Refresh the list
      return data
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const uncompleteStep = async (processId: string, stepId: string) => {
    try {
      const response = await fetch("/api/onboarding/steps/uncomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          process_id: processId,
          step_id: stepId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to uncomplete step")
      }

      await fetchProcesses() // Refresh the list
      return data
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  useEffect(() => {
    fetchProcesses()
  }, [])

  return {
    processes,
    loading,
    error,
    refetch: fetchProcesses,
    createProcess,
    completeStep,
    uncompleteStep,
  }
}

export function useOnboardingDocuments() {
  const [documents, setDocuments] = useState<OnboardingDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/onboarding/documents")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch documents")
      }

      setDocuments(data.documents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const createDocument = async (documentData: Partial<OnboardingDocument>) => {
    try {
      const response = await fetch("/api/onboarding/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(documentData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create document")
      }

      await fetchDocuments() // Refresh the list
      return data.document
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    createDocument,
  }
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/onboarding/employees")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch employees")
      }

      setEmployees(data.employees || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
  }
}
