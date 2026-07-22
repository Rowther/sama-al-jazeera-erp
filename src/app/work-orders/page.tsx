"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Search, Filter, ArrowUpRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { WORK_ORDER_STATUSES } from "@/lib/constants"
import { useAuthStore } from "@/stores/authStore"

const statusOptions = [{ value: "", label: "All Statuses" }, ...WORK_ORDER_STATUSES.map((s: any) => ({ value: s.value, label: s.label }))]

export default function WorkOrdersPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["work-orders", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      params.set("limit", "200")
      return api.get<any>(`/work-orders?${params.toString()}`)
    },
  })

  const workOrders = data?.workOrders || []

  const filtered = useMemo(() =>
    workOrders.filter((wo: any) =>
      !search
      || wo.workOrderId?.toLowerCase().includes(search.toLowerCase())
      || wo.customer?.name?.toLowerCase().includes(search.toLowerCase())
      || wo.customer?.phone?.toLowerCase().includes(search.toLowerCase())
      || wo.furnitureType?.toLowerCase().includes(search.toLowerCase())
      || wo.projectType?.toLowerCase().includes(search.toLowerCase())
      || wo.assignedTo?.name?.toLowerCase().includes(search.toLowerCase())
    ),
  [workOrders, search])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} {search ? "matching" : "total"} orders</p>
        </div>
        {(user?.role === "MANAGER" || user?.role === "OWNER") && (
          <Button className="w-full sm:w-auto" onClick={() => router.push("/work-orders/new")}>
            <Plus className="h-4 w-4 mr-1" /> New Work Order
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by ID or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="All Statuses"
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filtered.map((wo: any) => (
          <Card key={wo.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${wo.priority === "URGENT" ? "bg-red-50" : wo.priority === "HIGH" ? "bg-orange-50" : "bg-[#EEF4FF]"}`}>
                    <ArrowUpRight className={`h-4 w-4 sm:h-5 sm:w-5 ${wo.priority === "URGENT" ? "text-[#F45D5D]" : wo.priority === "HIGH" ? "text-[#FFB648]" : "text-[#4F8EF7]"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">{wo.workOrderId}</h3>
                      <StatusBadge status={wo.status} />
                      <StatusBadge status={wo.priority} />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{wo.customer?.name}{wo.customer?.location ? ` • ${wo.customer.location}` : ""}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                      {wo.dueDate && <span>Due: {formatDate(wo.dueDate)}</span>}
                      {wo.assignedTo?.name && <span>Designer: {wo.assignedTo.name}</span>}
                      {wo.furnitureType && <span>{wo.furnitureType}</span>}
                    </div>
                  </div>
                </div>
                {(user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "ACCOUNTANT") && (wo.totalCost > 0 || wo.estimatedBudget > 0) && (
                  <div className="text-right shrink-0">
                    {wo.totalCost > 0 && <p className="text-sm font-semibold text-gray-900">{formatCurrency(wo.totalCost)}</p>}
                    {wo.estimatedBudget > 0 && <p className="text-xs text-gray-400">Total Job Value: {formatCurrency(wo.estimatedBudget)}</p>}
                  </div>
                )}
                {user?.role !== "OWNER" && user?.role !== "MANAGER" && user?.role !== "ACCOUNTANT" && wo.productionManagerBudget > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Production Budget: {formatCurrency(wo.productionManagerBudget)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-400">No work orders found</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
