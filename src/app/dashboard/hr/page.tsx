"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { KPICard } from "@/components/ui/kpi-card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Users, CalendarCheck, Clock, AlertTriangle, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Employee, Payroll } from "@/types"

export default function HRDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrollRecords, setPayrollRecords] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<any>("/employees?page=1&limit=200").then(r => setEmployees(r.employees || [])),
      api.get<any>("/payroll?page=1&limit=50").then(r => setPayrollRecords(r.payrollRecords || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  const activeEmployees = employees.filter(e => e.user?.isActive !== false)
  const pendingPayroll = payrollRecords.filter(p => p.status === "PENDING")
  const totalMonthlySalaries = payrollRecords
    .filter(p => p.status === "PAID" || p.status === "PENDING")
    .reduce((s, p) => s + p.netSalary, 0)
  const visaExpiring = employees.filter(e => e.visaExpiry && new Date(e.visaExpiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">HR Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Workforce overview and management</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Employees" value={activeEmployees.length} icon={<Users className="h-5 w-5" />} />
        <KPICard title="Monthly Salaries" value={formatCurrency(totalMonthlySalaries)} icon={<Clock className="h-5 w-5" />} />
        <KPICard title="Pending Approvals" value={pendingPayroll.length} icon={<CalendarCheck className="h-5 w-5" />} />
        <KPICard title="Visa Expiring (90d)" value={visaExpiring.length} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Active Employees</h2>
            <Link href="/employees" className="text-sm text-[#4F8EF7] hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {activeEmployees.slice(0, 10).map(emp => (
              <Link key={emp.id} href={`/employees/${emp.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{emp.user?.name}</p>
                  <p className="text-xs text-gray-400">{emp.designation || emp.department || emp.user?.role?.replace("_", " ")}</p>
                </div>
                <span className="text-xs text-gray-400">{emp.employeeId}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Visa Expiry Alerts</h2>
          </div>
          {visaExpiring.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No visas expiring soon</p>
          ) : (
            <div className="space-y-3">
              {visaExpiring.slice(0, 10).map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.user?.name}</p>
                    <p className="text-xs text-amber-600">Visa: {emp.visaNumber} expires {emp.visaExpiry ? formatDate(emp.visaExpiry) : "N/A"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
