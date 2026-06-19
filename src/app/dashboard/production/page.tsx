"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useRouter } from "next/navigation"
import {
  Play, Pause, CheckCircle2, Clock, AlertTriangle, Users, Package,
  ArrowRight, BarChart3, UserPlus, FileText
} from "lucide-react"

export default function ProductionDashboard() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [workerUserId, setWorkerUserId] = useState("")
  const [workerRole, setWorkerRole] = useState("CARPENTER")

  const { data, isLoading } = useQuery({
    queryKey: ["production-dashboard"],
    queryFn: () => api.get<any>("/dashboard/production"),
    refetchInterval: 30000,
  })

  const { data: usersData } = useQuery({
    queryKey: ["users", "labour"],
    queryFn: () => api.get<any>("/users"),
  })
  const labourUsers = (usersData?.users || []).filter((u: any) => u.role === "LABOUR")

  const productionAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/work-orders/${id}/production`, { action }),
    onSuccess: () => {
      toast.success("Production updated")
      queryClient.invalidateQueries({ queryKey: ["production-dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["work-orders"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const assignWorker = useMutation({
    mutationFn: ({ id, userId, role }: { id: string; userId: string; role: string }) =>
      api.post(`/work-orders/${id}/workers`, [{ userId, role }]),
    onSuccess: () => {
      toast.success("Worker assigned")
      setShowAssignModal(false)
      setWorkerUserId("")
      queryClient.invalidateQueries({ queryKey: ["production-dashboard"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const stats = data?.stats || {}
  const activeOrders = data?.activeOrders || []
  const productionQueue = data?.productionQueue || []
  const delayedOrders = data?.delayedOrders || []
  const upcomingDeliveries = data?.upcomingDeliveries || []
  const recentCompleted = data?.recentCompleted || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" data-tour="production-title">Production Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Monitor and manage production workflow</p>
        </div>
        <Button variant="outline" className="shrink-0 self-start sm:self-auto" onClick={() => router.push("/work-orders")}>
          <BarChart3 className="h-4 w-4 mr-1" /> All Work Orders
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="production-kpis">
        <Card><CardContent className="p-4 text-center">
          <Play className="h-5 w-5 text-[#4F8EF7] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{stats.totalActive || 0}</p>
          <p className="text-xs text-gray-500">In Production</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Clock className="h-5 w-5 text-[#FFB648] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{stats.totalInQueue || 0}</p>
          <p className="text-xs text-gray-500">In Queue</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 text-[#F45D5D] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{stats.totalDelayed || 0}</p>
          <p className="text-xs text-gray-500">Delayed</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-[#36B37E] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{stats.totalUpcoming || 0}</p>
          <p className="text-xs text-gray-500">Upcoming Deliveries</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Production */}
        <Card data-tour="production-active">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-[#4F8EF7]" /> Active Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeOrders.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No active production</p>
              )}
              {activeOrders.map((wo: any) => (
                <div key={wo.id} className="rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{wo.workOrderId}</span>
                      <StatusBadge status={wo.status} />
                    </div>
                    <div className="flex gap-1">
                      {wo.status === "IN_PRODUCTION" || wo.status === "PRODUCTION_STARTED" ? (
                        <>
                          <Button size="sm" variant="warning" onClick={() => productionAction.mutate({ id: wo.id, action: "PAUSE" })} disabled={productionAction.isPending}>
                            <Pause className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="success" onClick={() => productionAction.mutate({ id: wo.id, action: "COMPLETE" })} disabled={productionAction.isPending}>
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{wo.customer?.name}</span>
                    <span>Due: {wo.dueDate ? formatDate(wo.dueDate) : "-"}</span>
                  </div>
                  {/* Active Stages */}
                  {(wo.productionStages || []).length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {wo.productionStages.map((stage: any) => (
                        <span
                          key={stage.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            stage.status === "IN_PROGRESS" ? "bg-[#EEF4FF] text-[#4F8EF7]" :
                            stage.isDelayed ? "bg-red-100 text-[#F45D5D]" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {stage.stageName}
                          {stage.completionPercentage > 0 && ` ${stage.completionPercentage}%`}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Workers */}
                  <div className="flex items-center gap-2 mt-2">
                    {(wo.workerAssignments || []).length > 0 ? (
                      <div className="flex -space-x-1.5">
                        {wo.workerAssignments.slice(0, 4).map((wa: any) => (
                          <div key={wa.id} className="h-6 w-6 rounded-full bg-[#4F8EF7]/10 flex items-center justify-center border-2 border-white">
                            <span className="text-[8px] font-semibold text-[#4F8EF7]">
                              {wa.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No workers assigned</span>
                    )}
                    <Button size="sm" variant="ghost" className="ml-auto h-6 text-xs" onClick={() => { setSelectedOrderId(wo.id); setShowAssignModal(true) }}>
                      <UserPlus className="h-3 w-3 mr-1" /> Assign
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Production Queue */}
        <Card data-tour="production-queue">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#FFB648]" /> Production Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productionQueue.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Queue is empty</p>
              )}
              {productionQueue.map((wo: any) => (
                <div key={wo.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 text-[#FFB648]">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                      <p className="text-xs text-gray-400">{wo.customer?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={wo.status} />
                    <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); productionAction.mutate({ id: wo.id, action: "START" }) }} disabled={productionAction.isPending}>
                      <Play className="h-3 w-3 mr-1" /> Start
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delayed Orders */}
        {delayedOrders.length > 0 && (
          <Card data-tour="production-delays">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[#F45D5D]" /> Delayed Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {delayedOrders.map((wo: any) => (
                  <div key={wo.id} className="flex items-center justify-between p-3 rounded-xl bg-red-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                      <p className="text-xs text-gray-500">{wo.customer?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-[#F45D5D]">{wo.delayDays || 0} days delayed</p>
                      <StatusBadge status={wo.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#36B37E]" /> Upcoming Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDeliveries.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No upcoming deliveries</p>
              )}
              {upcomingDeliveries.slice(0, 10).map((wo: any) => (
                <div key={wo.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                    <p className="text-xs text-gray-400">{wo.customer?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-700">{wo.dueDate ? formatDate(wo.dueDate) : "-"}</p>
                    <StatusBadge status={wo.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Completed */}
      {recentCompleted.length > 0 && (
        <Card data-tour="production-completed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#36B37E]" /> Recently Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentCompleted.slice(0, 6).map((wo: any) => (
                <div key={wo.id} className="flex items-center justify-between p-3 rounded-xl bg-green-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                    <p className="text-xs text-gray-500">{wo.customer?.name}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Worker Modal */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Worker" size="sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Worker</label>
            <Select
              options={labourUsers.map((u: any) => ({ value: u.id, label: u.name }))}
              value={workerUserId}
              onChange={(e) => setWorkerUserId(e.target.value)}
              placeholder="Select worker"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Role</label>
            <Select
              options={[
                { value: "CARPENTER", label: "Carpenter" },
                { value: "PAINTER", label: "Painter" },
                { value: "FINISHER", label: "Finisher" },
                { value: "HELPER", label: "Helper" },
                { value: "ELECTRICIAN", label: "Electrician" },
                { value: "PLUMBER", label: "Plumber" },
                { value: "OTHER", label: "Other" },
              ]}
              value={workerRole}
              onChange={(e) => setWorkerRole(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={() => selectedOrderId && assignWorker.mutate({ id: selectedOrderId, userId: workerUserId, role: workerRole })}
            disabled={assignWorker.isPending || !workerUserId}
          >
            <UserPlus className="h-4 w-4 mr-1" /> Assign to Work Order
          </Button>
        </div>
      </Modal>
    </div>
  )
}
