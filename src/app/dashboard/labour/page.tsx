"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import { KPICard } from "@/components/ui/kpi-card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Briefcase, Clock, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import type { WorkOrder } from "@/types"

export default function LabourDashboard() {
  const user = useAuthStore(s => s.user)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    api.get<any>(`/work-orders?page=1&limit=100`)
      .then(res => {
        const orders = res.workOrders || []
        const myOrders = user?.id
          ? orders.filter((wo: any) => (wo.teamMembers || []).some((tm: any) => tm.userId === user.id))
          : []
        setWorkOrders(myOrders)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  const activeOrders = workOrders.filter(wo =>
    !["DELIVERED", "CLOSED", "CANCELLED"].includes(wo.status)
  )

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">My Workspace</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Welcome back, {user?.name}</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Assigned Work Orders" value={workOrders.length} icon={<Briefcase className="h-5 w-5" />} />
        <KPICard title="Active" value={activeOrders.length} icon={<Clock className="h-5 w-5" />} />
        <KPICard title="Completed" value={workOrders.filter(wo => wo.status === "DELIVERED" || wo.status === "CLOSED").length} icon={<CheckCircle className="h-5 w-5" />} />
        <KPICard title="Overdue" value={workOrders.filter(wo => wo.isDelayed).length} icon={<AlertCircle className="h-5 w-5" />} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">My Work Orders</h2>
        {workOrders.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No work orders assigned to you yet</p>
        ) : (
          <div className="space-y-2">
            {workOrders.map(wo => (
              <Link key={wo.id} href={`/work-orders/${wo.id}`}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                    <p className="text-xs text-gray-400">{wo.customer?.name} · {wo.projectType || wo.furnitureType || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={
                    wo.status === "PRODUCTION_STARTED" ? "bg-orange-100 text-orange-700" :
                    wo.status === "PRODUCTION_COMPLETED" ? "bg-green-100 text-green-700" :
                    wo.isDelayed ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-700"
                  }>
                    {wo.status.replace(/_/g, " ")}
                  </Badge>
                  {wo.dueDate && (
                    <span className="text-xs text-gray-400">{formatDate(wo.dueDate)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
