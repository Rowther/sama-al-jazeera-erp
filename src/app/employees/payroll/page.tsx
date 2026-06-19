"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { formatCurrency } from "@/lib/utils"
import { Wallet, Download, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PayrollPage() {
  const router = useRouter()

  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get<any>("/employees"),
  })

  const employees = employeesData?.employees || []

  const totalSalaries = employees.reduce((s: number, e: any) => s + (e.salary || 0), 0)
  const paidEmployees = employees.filter((e: any) => e.payroll?.some((p: any) => p.status === "PAID"))
  const pendingPayroll = employees.filter((e: any) => !e.payroll?.some((p: any) => p.status === "PAID"))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500 mt-1">Monthly salary management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button><Plus className="h-4 w-4 mr-1" /> Generate Payroll</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
          <p className="text-xs text-gray-500">Total Employees</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-[#36B37E]">{formatCurrency(totalSalaries)}</p>
          <p className="text-xs text-gray-500">Total Monthly Salaries</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{pendingPayroll.length}</p>
          <p className="text-xs text-gray-500">Pending Salary</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{paidEmployees.length}</p>
          <p className="text-xs text-gray-500">Paid This Month</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Employee Payroll</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Employee</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Salary</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Overtime</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Slip</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={emp.id} className="border-b border-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.user?.name} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{emp.user?.name}</p>
                          <p className="text-xs text-gray-400">{emp.department || "N/A"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{emp.salary ? formatCurrency(emp.salary) : "-"}</td>
                    <td className="py-3 px-4 text-gray-700">{emp.overtimeRate ? formatCurrency(emp.overtimeRate) + "/hr" : "-"}</td>
                    <td className="py-3 px-4">
                      {emp.payroll?.some((p: any) => p.status === "PAID") ? (
                        <StatusBadge status="PAID" />
                      ) : (
                        <StatusBadge status="PENDING" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm"><Download className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
