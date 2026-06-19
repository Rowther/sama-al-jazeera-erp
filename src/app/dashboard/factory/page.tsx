"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Progress } from "@/components/ui/progress"
import { Modal } from "@/components/ui/modal"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"
import {
  Play, Clock, AlertTriangle, Users, Package, CheckCircle2,
  ArrowRight, BarChart3, Settings, Truck, ClipboardList, Search,
  TrendingUp, TrendingDown, AlertOctagon, UserCheck, Wrench,
  XCircle, Eye, Activity, Zap, Layers
} from "lucide-react"

const DELAY_COLORS = {
  LOW: "bg-green-50 border-green-200",
  MEDIUM: "bg-yellow-50 border-yellow-200",
  HIGH: "bg-orange-50 border-orange-200",
  CRITICAL: "bg-red-50 border-red-200",
}

export default function FactoryDashboard() {
  const router = useRouter()
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ["factory-dashboard"],
    queryFn: () => api.get<any>("/dashboard/factory"),
    refetchInterval: 30000,
  })

  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showBottleneckModal, setShowBottleneckModal] = useState(false)

  const stats = data?.stats || {}
  const activeOrders = data?.activeOrders || []
  const productionQueue = data?.productionQueue || []
  const delayedOrders = data?.delayedOrders || []
  const materialShortages = data?.materialShortages || []
  const upcomingDeliveries = data?.upcomingDeliveries || []
  const recentCompleted = data?.recentCompleted || []
  const workerUtilization = data?.workerUtilization || []
  const stageCompletionRates = data?.stageCompletionRates || []

  const utilizationRate = useMemo(() => {
    if (workerUtilization.length === 0) return 0
    const activeCount = workerUtilization.filter((w: any) => w.eventsToday > 0).length
    return Math.round((activeCount / workerUtilization.length) * 100)
  }, [workerUtilization])

  const bottleneckStages = useMemo(() => {
    const stageMap: Record<string, { count: number; delayed: number }> = {}
    for (const order of activeOrders) {
      for (const stage of order.productionStages || []) {
        if (!stageMap[stage.stageName]) stageMap[stage.stageName] = { count: 0, delayed: 0 }
        stageMap[stage.stageName].count++
        if (stage.isDelayed) stageMap[stage.stageName].delayed++
      }
    }
    return Object.entries(stageMap)
      .map(([name, data]) => ({ name, ...data, bottleneckPct: Math.round((data.delayed / Math.max(data.count, 1)) * 100) }))
      .filter(s => s.bottleneckPct > 0)
      .sort((a, b) => b.bottleneckPct - a.bottleneckPct)
  }, [activeOrders])

  const canView = user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "PRODUCTION_MANAGER"

  if (!canView) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Access restricted to management roles</div>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2" data-tour="factory-title">
            <Settings className="h-6 w-6 text-[#4F8EF7]" /> Factory Operations
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real-time production monitoring and factory coordination • Last updated: {formatDateTime(new Date())}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/schedule")}>
            <Users className="h-4 w-4 mr-1" /> Schedule
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/work-orders")}>
            <ClipboardList className="h-4 w-4 mr-1" /> All Orders
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-tour="factory-kpis">
        <Card className="border-l-4 border-l-[#4F8EF7]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Active Production</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalActive || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-[#EEF4FF]">
                <Play className="h-5 w-5 text-[#4F8EF7]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#FFB648]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">In Queue</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalInQueue || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-[#FFB648]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#F45D5D]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Delayed</p>
                <p className="text-2xl font-bold text-[#F45D5D]">{stats.totalDelayed || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50">
                <AlertTriangle className="h-5 w-5 text-[#F45D5D]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#36B37E]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Workers Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWorkers || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-50">
                <Users className="h-5 w-5 text-[#36B37E]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Production - Kanban Style */}
        <div className="lg:col-span-2 space-y-4">
          <Card data-tour="factory-active">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Play className="h-4 w-4 text-[#4F8EF7]" /> Active Production</span>
                <Badge variant="primary">{activeOrders.length} running</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Play className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No active production orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeOrders.map((wo: any) => {
                    const activeStages = wo.productionStages || []
                    const delayedStage = activeStages.find((s: any) => s.isDelayed)
                    const progress = wo.productionStages?.length
                      ? Math.round(wo.productionStages.filter((s: any) => s.status === "COMPLETED").length / wo.productionStages.length * 100)
                      : 0
                    return (
                      <div
                        key={wo.id}
                        className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                          wo.isDelayed ? "border-red-300 bg-red-50/30" : "border-gray-100"
                        }`}
                        onClick={() => router.push(`/work-orders/${wo.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900">{wo.workOrderId}</span>
                            <StatusBadge status={wo.status} />
                            {wo.isDelayed && (
                              <Badge variant="danger">⚠ {wo.delayDays || 0}d late</Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 font-medium">{progress}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <span>{wo.customer?.name}</span>
                          <span>Due: {wo.dueDate ? formatDate(wo.dueDate) : "-"}</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
                          <div className={`h-full rounded-full ${wo.isDelayed ? "bg-red-400" : "bg-[#4F8EF7]"}`} style={{ width: `${progress}%` }} />
                        </div>
                        {/* Active Stages */}
                        {activeStages.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {activeStages.slice(0, 5).map((s: any) => (
                              <span
                                key={s.id}
                                className={`text-[9px] px-1.5 py-0.5 rounded ${
                                  s.status === "IN_PROGRESS" ? "bg-[#EEF4FF] text-[#4F8EF7]" :
                                  s.isDelayed ? "bg-red-100 text-red-600" :
                                  s.status === "COMPLETED" ? "bg-green-100 text-green-600" :
                                  "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {s.stageName}
                              </span>
                            ))}
                            {activeStages.length > 5 && (
                              <span className="text-[9px] text-gray-400">+{activeStages.length - 5}</span>
                            )}
                          </div>
                        )}
                        {/* Workers */}
                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-1.5">
                            {(wo.workerAssignments || []).slice(0, 5).map((wa: any) => (
                              <div key={wa.id} className="h-6 w-6 rounded-full bg-[#4F8EF7]/10 flex items-center justify-center border-2 border-white">
                                <span className="text-[7px] font-bold text-[#4F8EF7]">
                                  {wa.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {delayedStage && (
                            <span className="text-[10px] text-red-500 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {delayedStage.stageName} delayed
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Production Queue */}
          <Card data-tour="factory-queue">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#FFB648]" /> Production Queue</span>
                <Badge variant="warning">{productionQueue.length} waiting</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productionQueue.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">Queue is empty</div>
              ) : (
                <div className="space-y-2">
                  {productionQueue.slice(0, 10).map((wo: any) => (
                    <div
                      key={wo.id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/work-orders/${wo.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-amber-50">
                          <Clock className="h-3.5 w-3.5 text-[#FFB648]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                          <p className="text-xs text-gray-400">{wo.customer?.name}</p>
                        </div>
                      </div>
                      <StatusBadge status={wo.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4" data-tour="factory-sidebar">
          {/* Delayed Orders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[#F45D5D]" /> Delayed</span>
                <Badge variant="danger">{delayedOrders.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {delayedOrders.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> All on track
                </div>
              ) : (
                <div className="space-y-2">
                  {delayedOrders.slice(0, 8).map((wo: any) => (
                    <div
                      key={wo.id}
                      className="p-3 rounded-xl bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100 transition-all"
                      onClick={() => router.push(`/work-orders/${wo.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-900">{wo.workOrderId}</span>
                        <span className="text-[10px] font-bold text-red-600">{wo.delayDays || 0}d</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{wo.customer?.name}</p>
                      {wo.delayAlerts?.length > 0 && (
                        <p className="text-[9px] text-red-500 mt-1">{wo.delayAlerts[0]?.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Material Shortages */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Package className="h-4 w-4 text-[#FFB648]" /> Material Shortages</span>
                <Badge variant="warning">{materialShortages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {materialShortages.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No shortages</div>
              ) : (
                <div className="space-y-2">
                  {materialShortages.slice(0, 6).map((mat: any) => (
                    <div key={mat.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{mat.materialName}</p>
                        <p className="text-[10px] text-gray-500">{mat.workOrder?.workOrderId}</p>
                      </div>
                      <Badge variant={mat.status === "OUT_OF_STOCK" ? "danger" : "warning"}>
                        {mat.status?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottleneck Detection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#8B5CF6]" /> Bottlenecks</span>
                <Badge variant="primary">{bottleneckStages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bottleneckStages.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No bottlenecks detected</div>
              ) : (
                <div className="space-y-2">
                  {bottleneckStages.slice(0, 5).map((b: any) => (
                    <div key={b.name} className="p-2 rounded-lg bg-purple-50">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-900">{b.name}</span>
                        <span className="text-purple-600 font-semibold">{b.delayed}/{b.count} delayed</span>
                      </div>
                      <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${b.bottleneckPct}%` }} />
                      </div>
                      <p className="text-[9px] text-purple-500 mt-0.5">{b.bottleneckPct}% bottleneck rate</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Worker Utilization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[#36B37E]" /> Worker Utilization</span>
                <Badge variant={utilizationRate > 80 ? "warning" : "success"}>{utilizationRate}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workerUtilization.slice(0, 8).map((w: any) => {
                  const pct = Math.min((w.eventsToday / 3) * 100, 100)
                  return (
                    <div key={w.id} className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-[#4F8EF7]/10 flex items-center justify-center shrink-0">
                        <span className="text-[7px] font-bold text-[#4F8EF7]">
                          {w.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-gray-700 truncate">{w.name}</span>
                          <span className="text-[9px] text-gray-400">{w.eventsToday} event(s)</span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
                          <div className={`h-full rounded-full ${pct > 80 ? "bg-red-400" : pct > 50 ? "bg-amber-400" : "bg-green-400"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deliveries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-[#36B37E]" /> Upcoming Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeliveries.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">No upcoming deliveries</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcomingDeliveries.map((wo: any) => (
                  <div
                    key={wo.id}
                    className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 px-2 rounded-lg"
                    onClick={() => router.push(`/work-orders/${wo.id}`)}
                  >
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
            )}
          </CardContent>
        </Card>

        {/* Recently Completed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#36B37E]" /> Recently Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCompleted.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">No completed orders</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recentCompleted.map((wo: any) => (
                  <div
                    key={wo.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-green-50 cursor-pointer hover:bg-green-100 transition-all"
                    onClick={() => router.push(`/work-orders/${wo.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                      <p className="text-xs text-gray-500">{wo.customer?.name}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
