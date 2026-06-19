"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { PenTool, Clock, CheckCircle2, AlertCircle, FileText, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"

export default function DesignerDashboard() {
  const router = useRouter()
  const { user } = useAuthStore()

  const { data: workOrdersData } = useQuery({
    queryKey: ["work-orders", "assigned"],
    queryFn: () => api.get<any>(`/work-orders?assignedTo=${user?.id}`),
  })

  const { data: designsData } = useQuery({
    queryKey: ["designs"],
    queryFn: () => api.get<any>("/designs"),
  })

  const workOrders = workOrdersData?.workOrders || []
  const designs = designsData?.designs || []

  const pendingReview = designs.filter((d: any) => d.status === "PENDING_REVIEW")
  const inProgress = workOrders.filter((w: any) => w.status === "DESIGN_IN_PROGRESS")
  const completed = designs.filter((d: any) => d.status === "APPROVED")

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" data-tour="designer-title">Designer Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Your design assignments and tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-tour="designer-kpis">
        <Card><CardContent className="p-4 text-center">
          <PenTool className="h-5 w-5 text-[#4F8EF7] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{workOrders.length}</p>
          <p className="text-xs text-gray-500">Total Assignments</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Clock className="h-5 w-5 text-[#FFB648] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{inProgress.length}</p>
          <p className="text-xs text-gray-500">In Progress</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <AlertCircle className="h-5 w-5 text-[#F45D5D] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{pendingReview.length}</p>
          <p className="text-xs text-gray-500">Pending Review</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-[#36B37E] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{completed.length}</p>
          <p className="text-xs text-gray-500">Approved</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-tour="designer-assignments">
          <CardHeader><CardTitle>Assigned Work Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workOrders.map((wo: any) => (
                <div key={wo.id} className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100 hover:shadow-sm cursor-pointer transition-all" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#EEF4FF]">
                      <PenTool className="h-4 w-4 text-[#4F8EF7]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{wo.workOrderId}</p>
                      <p className="text-xs text-gray-400">{wo.customer?.name} • {wo.furnitureType || "N/A"}</p>
                      <div className="mt-2"><StatusBadge status={wo.status} /></div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
              ))}
              {workOrders.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No assignments yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-tour="designer-reviews">
          <CardHeader><CardTitle>Design Reviews</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingReview.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100 hover:shadow-sm cursor-pointer transition-all" onClick={() => router.push(`/work-orders/${d.workOrder?.id}`)}>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{d.title}</p>
                    <p className="text-xs text-gray-400">{d.workOrder?.workOrderId} • v{d.version}</p>
                    <div className="mt-2"><StatusBadge status={d.status} /></div>
                  </div>
                </div>
              ))}
              {pendingReview.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No designs pending review</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
