"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { Package, BarChart3, Calendar, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function InventoryUsagePage() {
  const router = useRouter()
  const [period, setPeriod] = useState("monthly")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-usage", period, page],
    queryFn: () => api.get<any>(`/inventory/usage?period=${period}&page=${page}&limit=20`),
    staleTime: 30000,
  })

  const usage = data?.usage || []
  const periods = data?.periods || []
  const pagination = data?.pagination

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory Usage Report</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Material consumption across work orders</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            options={[
              { value: "daily", label: "Daily (Last 30 Days)" },
              { value: "weekly", label: "Weekly (Last 90 Days)" },
              { value: "monthly", label: "Monthly (Last Year)" },
            ]}
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-5 w-5 text-[#4F8EF7] mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{pagination?.total || 0}</p>
            <p className="text-xs text-gray-500">Materials Used</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-5 w-5 text-[#36B37E] mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{periods.length}</p>
            <p className="text-xs text-gray-500">{period === "daily" ? "Days" : period === "weekly" ? "Weeks" : "Months"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 text-[#FFB648] mx-auto mb-1" />
            <p className="text-xs text-gray-500 capitalize">{period} View</p>
          </CardContent>
        </Card>
      </div>

      {usage.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-200" />
            <p>No inventory usage data found for this period</p>
          </CardContent>
        </Card>
      )}

      {usage.map((item: any) => {
        const sortedPeriodKeys = Object.keys(item.periods).sort()
        const totalUsed = sortedPeriodKeys.reduce((s: number, k: string) => s + item.periods[k].total, 0)
        return (
          <Card key={item.itemId}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{item.itemName}</CardTitle>
                  <p className="text-xs text-gray-400">{item.category} &middot; {item.unit}</p>
                </div>
                <Badge variant="primary">{totalUsed} {item.unit} total</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">{period === "daily" ? "Date" : period === "weekly" ? "Week Starting" : "Month"}</th>
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Qty Used</th>
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Transactions</th>
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPeriodKeys.slice(-10).map((pk: string) => {
                      const p = item.periods[pk]
                      return (
                        <tr key={pk} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-2 font-medium text-gray-900">{pk}</td>
                          <td className="py-2 px-2">{p.total} {item.unit}</td>
                          <td className="py-2 px-2">{p.count}</td>
                          <td className="py-2 px-2">
                            <div className="flex flex-wrap gap-1">
                              {p.movements.slice(0, 3).map((mv: any) => (
                                <span key={mv.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full" title={mv.notes || ""}>
                                  {mv.quantity} {item.unit}
                                  {mv.referenceType === "WORK_ORDER" && " (WO)"}
                                </span>
                              ))}
                              {p.movements.length > 3 && (
                                <span className="text-xs text-gray-400">+{p.movements.length - 3} more</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {sortedPeriodKeys.length === 0 && (
                      <tr><td colSpan={4} className="py-4 text-center text-gray-400">No usage data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
          <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
