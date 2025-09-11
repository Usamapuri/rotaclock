"use client"

import Link from "next/link"

export default function AdminLeavePage() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold">Leave Management</h1>
        <Link href="/admin/shift-approvals" className="text-sm text-blue-600 underline">Go to Approvals</Link>
      </div>
      <p className="text-sm text-gray-600">Centralize holiday allowance, requests, and sickness.</p>
      <div className="mt-4 text-sm text-gray-500">Leave dashboard coming soon.</div>
    </div>
  )
}


