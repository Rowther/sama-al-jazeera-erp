"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { formatCurrency, formatDate } from "@/lib/utils"
import { PlusCircle, ClipboardList, CheckCircle2, Clock, AlertTriangle, Users, ArrowRight, Package } from "lucide-react"
import { useRouter } from "next/navigation"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

export default function ManagerDashboard() {
  const router = useRouter()

  const { data: workOrdersData } = useQuery({
    queryKey: ["work-orders"],
    queryFn: () => api.get<any>("/work-orders"),
  })

  const { data: activitiesData } = useQuery({
    queryKey: ["activities"],
    queryFn: () => api.get<any>("/activity"),
  })

  const workOrders = workOrdersData?.workOrders || []
  const activities = activitiesData?.activities || []

  const total = workOrders.length
  const active = workOrders.filter((w: any) =>
    ["APPROVED", "WORK_ORDER_CREATED", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "DESIGN_COMPLETED", "DESIGN_SUBMITTED", "DESIGN_APPROVED", "MATERIAL_REVIEW", "READY_FOR_PRODUCTION", "IN_PRODUCTION", "PRODUCTION_STARTED", "READY_FOR_DELIVERY"].includes(w.status)
  ).length
  const inProduction = workOrders.filter((w: any) => ["PRODUCTION_STARTED", "IN_PRODUCTION", "PRODUCTION_COMPLETED", "READY_FOR_PRODUCTION", "READY_FOR_DELIVERY"].includes(w.status)).length
  const delayed = workOrders.filter((w: any) => w.isDelayed).length
  const completed = workOrders.filter((w: any) => w.status === "DELIVERED" || w.status === "COMPLETED" || w.status === "CLOSED").length

  const pendingApproval = workOrders.filter((w: any) => w.status === "DESIGN_SUBMITTED" || w.status === "DESIGN_COMPLETED")

  const pendingMaterialReview = workOrders.filter((w: any) => w.status === "MATERIAL_REVIEW")

  const pipelineData = [
    { name: "Active", value: active },
    { name: "In Production", value: inProduction },
    { name: "Delayed", value: delayed },
    { name: "Completed", value: completed },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 data-tour="manager-title" className="text-xl sm:text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Work order pipeline and production tracking</p>
        </div>
        <Button data-tour="manager-new-wo" className="w-full sm:w-auto" onClick={() => router.push("/work-orders/new")}>
          <PlusCircle className="h-4 w-4 mr-1" /> New Work Order
        </Button>
      </div>

      {/* KPI Cards */}
      <div data-tour="manager-kpis" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <Card><CardContent className="p-4 text-center">
          <ClipboardList className="h-5 w-5 text-[#4F8EF7] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500">Total Orders</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-[#36B37E] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{active}</p>
          <p className="text-xs text-gray-500">Active</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 text-[#FFB648] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{pendingApproval.length}</p>
          <p className="text-xs text-gray-500">Pending Approval</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Clock className="h-5 w-5 text-[#F45D5D] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{delayed}</p>
          <p className="text-xs text-gray-500">Delayed</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 text-[#8B5CF6] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{completed}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Chart */}
        <Card data-tour="manager-pipeline" className="lg:col-span-2">
          <CardHeader><CardTitle>Work Order Pipeline</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {pipelineData.map((_, i) => (
                      <Cell key={i} fill={["#4F8EF7", "#FFB648", "#F45D5D", "#8B5CF6"][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card data-tour="manager-approvals">
          <CardHeader><CardTitle>Pending Design Approvals</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApproval.slice(0, 5).map((wo: any) => (
                <div key={wo.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                    <p className="text-xs text-gray-400">{wo.customer?.name}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
              ))}
              {pendingApproval.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No pending approvals</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Materials Review */}
      {pendingMaterialReview.length > 0 && (
        <Card data-tour="manager-materials">
          <CardHeader><CardTitle>Materials Pending Review</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingMaterialReview.slice(0, 5).map((wo: any) => (
                <div key={wo.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-[#FFB648]" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                      <p className="text-xs text-gray-400">{wo.customer?.name}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

        {/* Recent Work Orders */}
      <Card data-tour="manager-table">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm sm:text-base">Recent Work Orders</CardTitle>
          <Button variant="outline" size="sm" onClick={() => router.push("/work-orders")}>View All</Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-500 font-medium text-xs uppercase whitespace-nowrap">ID</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-500 font-medium text-xs uppercase whitespace-nowrap">Customer</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-500 font-medium text-xs uppercase whitespace-nowrap">Status</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-500 font-medium text-xs uppercase whitespace-nowrap">Priority</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-500 font-medium text-xs uppercase whitespace-nowrap">Due Date</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-500 font-medium text-xs uppercase whitespace-nowrap">Designer</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-500 font-medium text-xs uppercase whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.slice(0, 10).map((wo: any) => (
                  <tr key={wo.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 sm:px-4 font-medium text-gray-900 whitespace-nowrap">{wo.workOrderId}</td>
                    <td className="py-3 px-2 sm:px-4 text-gray-700 whitespace-nowrap">{wo.customer?.name}</td>
                    <td className="py-3 px-2 sm:px-4"><StatusBadge status={wo.status} /></td>
                    <td className="py-3 px-2 sm:px-4"><StatusBadge status={wo.priority} /></td>
                    <td className="py-3 px-2 sm:px-4 text-gray-700 whitespace-nowrap">{wo.dueDate ? formatDate(wo.dueDate) : "-"}</td>
                    <td className="py-3 px-2 sm:px-4 text-gray-700 whitespace-nowrap">{wo.assignedTo?.name || "-"}</td>
                    <td className="py-3 px-2 sm:px-4">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/work-orders/${wo.id}`)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.slice(0, 8).map((act: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <Avatar name={act.user?.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{act.user?.name}</span> {act.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(act.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
