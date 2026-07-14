"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from "recharts"
import {
  TrendingUp, TrendingDown, DollarSign, Package, Users, Clock,
  AlertTriangle, FileText, ShieldAlert, Activity, Wallet, CreditCard,
  Building2, Calendar, ArrowUpRight, ArrowDownRight, Eye,
  BarChart3, Factory, UserCheck, ShoppingCart, Target, BrainCircuit
} from "lucide-react"
import { useRouter } from "next/navigation"

const COLORS = ["#4F8EF7", "#36B37E", "#FFB648", "#F45D5D", "#8B5CF6", "#EC4899"]

interface Anomaly {
  type: string
  severity: string
  message: string
  workOrderId?: string
}

export default function OwnerCommandCenter() {
  const router = useRouter()
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [activeTab, setActiveTab] = useState<string>("overview")

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get<any>("/analytics"),
  })

  const { data: workOrdersData } = useQuery({
    queryKey: ["work-orders"],
    queryFn: () => api.get<any>("/work-orders"),
  })

  const { data: activitiesData } = useQuery({
    queryKey: ["activities"],
    queryFn: () => api.get<any>("/activity"),
  })

  const { data: materialsData } = useQuery({
    queryKey: ["materials-analytics"],
    queryFn: () => api.get<any>("/materials"),
  })

  const { data: purchasesData } = useQuery({
    queryKey: ["purchases-analytics"],
    queryFn: () => api.get<any>("/purchase-entries"),
  })

  const { data: cashFlowData } = useQuery({
    queryKey: ["cash-flow"],
    queryFn: () => api.get<any>("/cash-flow?months=12"),
  })

  const { data: prodAnalytics } = useQuery({
    queryKey: ["production-analytics"],
    queryFn: () => api.get<any>("/production-analytics"),
  })

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<any>("/users"),
  })

  useEffect(() => {
    if (analytics?.anomalies) {
      setAnomalies(analytics.anomalies)
    }
  }, [analytics])

  const kpis = analytics?.kpis || {}
  const profitData = analytics?.profitByWO?.slice(0, 10) || []
  const activities = activitiesData?.activities || []
  const allMaterials = materialsData?.materials || []
  const allPurchases = purchasesData?.purchaseEntries || []
  const allUsers = usersData?.users || []
  const cashFlow = cashFlowData || { monthlyCashFlow: [], summary: {}, pendingPayments: [], pendingExpenses: [], expectedRevenue: [] }
  const prodStats = prodAnalytics?.summary || {}

  const workOrderLookup = useMemo(() => {
    const map = new Map<string, any>()
    for (const wo of (workOrdersData?.workOrders || [])) {
      map.set(wo.id, wo)
    }
    return map
  }, [workOrdersData])

  const topExpensiveWOs = useMemo(() => {
    const byWO = new Map<string, { workOrderId: string; actualCost: number; estimatedCost: number; customerName: string }>()
    for (const m of allMaterials) {
      const woId = m.workOrderId || m.workOrder?.id
      if (!woId) continue
      const existing = byWO.get(woId)
      const woRecord = workOrderLookup.get(woId)
      if (existing) {
        existing.actualCost += m.actualCost || 0
        existing.estimatedCost += m.estimatedCost || 0
      } else {
        byWO.set(woId, {
          workOrderId: woRecord?.workOrderId || woId,
          actualCost: m.actualCost || 0,
          estimatedCost: m.estimatedCost || 0,
          customerName: woRecord?.customer?.name || "",
        })
      }
    }
    return [...byWO.values()].sort((a, b) => b.actualCost - a.actualCost).slice(0, 5)
  }, [allMaterials, workOrderLookup])

  const woWithCostOverruns = useMemo(() =>
    allMaterials.filter((m: any) => m.actualCost > m.estimatedCost && m.estimatedCost > 0),
  [allMaterials])

  const supplierSpending = useMemo(() =>
    allPurchases.reduce((acc: any, pe: any) => {
      const name = pe.supplierName || pe.supplier?.name || "Unknown"
      acc[name] = (acc[name] || 0) + pe.totalCost
      return acc
    }, {} as Record<string, number>),
  [allPurchases])

  const topSuppliers = useMemo(() =>
    Object.entries(supplierSpending).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5),
  [supplierSpending])

  const emergencyPurchases = useMemo(() =>
    allPurchases.filter((pe: any) => pe.notes?.toLowerCase().includes("emergency") || pe.notes?.toLowerCase().includes("urgent")),
  [allPurchases])

  const inventoryShortages = useMemo(() =>
    allMaterials.filter((m: any) => m.status === "OUT_OF_STOCK"),
  [allMaterials])

  const materialAnomalies = useMemo(() => {
    const result: Anomaly[] = []
    for (const wo of topExpensiveWOs) {
      if (wo.actualCost > wo.estimatedCost * 1.1) {
        result.push({
          type: "MATERIAL_COST_OVERRUN",
          severity: wo.actualCost > wo.estimatedCost * 1.2 ? "high" : "medium",
          message: `WO ${wo.workOrderId}${wo.customerName ? ` (${wo.customerName})` : ""} exceeded estimated material budget by ${Math.round((wo.actualCost / wo.estimatedCost - 1) * 100)}%`,
          workOrderId: wo.workOrderId,
        })
      }
    }
    if (emergencyPurchases.length > 2) {
      result.push({
        type: "EMERGENCY_PURCHASES", severity: "high",
        message: `${emergencyPurchases.length} repeated emergency purchases detected — possible planning issues`,
      })
    }
    if (inventoryShortages.length > 0) {
      result.push({
        type: "INVENTORY_SHORTAGE", severity: inventoryShortages.length > 5 ? "high" : "medium",
        message: `${inventoryShortages.length} inventory shortages causing potential production delays`,
      })
    }
    return result
  }, [topExpensiveWOs, emergencyPurchases, inventoryShortages])

  const statusData = useMemo(() => [
    { name: "Completed", value: kpis.completed || 0 },
    { name: "In Production", value: kpis.inProduction || 0 },
    { name: "Pending", value: kpis.pending || 0 },
    { name: "Delayed", value: kpis.delayed || 0 },
    { name: "Cancelled", value: kpis.cancelled || 0 },
  ], [kpis])

  const activeWorkOrders = (workOrdersData?.workOrders || []).filter((wo: any) =>
    !["DELIVERED", "CLOSED", "CANCELLED"].includes(wo.status)
  )

  const highRiskWOs = useMemo(() =>
    activeWorkOrders.filter((wo: any) =>
      wo.isDelayed ||
      wo.costOverrun > 0 ||
      (wo.estimatedBudget && wo.totalCost > wo.estimatedBudget)
    ),
  [activeWorkOrders])

  const cashBurnRate = cashFlow.summary?.burnRate || 0
  const avgMonthlyIncome = cashFlow.summary?.averageMonthlyIncome || 0
  const avgMonthlyExpenses = cashFlow.summary?.averageMonthlyExpenses || 0
  const monthsOfRunway = avgMonthlyExpenses > 0 && cashFlow.summary?.currentCashBalance
    ? (cashFlow.summary.currentCashBalance / avgMonthlyExpenses).toFixed(1)
    : "0"

  const productivityMap = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {}
    activities.forEach((a: any) => {
      if (a.user?.name) {
        if (!map[a.user.name]) map[a.user.name] = { count: 0, total: 0 }
        map[a.user.name].count++
      }
    })
    return Object.entries(map).sort(([, a], [, b]) => b.count - a.count).slice(0, 5)
  }, [activities])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" />
          <p className="text-sm text-gray-400">Loading Command Center...</p>
        </div>
      </div>
    )
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Money Leak Detection */}
      {(anomalies.length > 0 || materialAnomalies.length > 0) && (
        <Card data-tour="owner-anomalies" className="border-red-100 bg-gradient-to-r from-red-50 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="h-5 w-5 text-[#F45D5D]" />
              <h2 className="text-lg font-semibold text-gray-900">Money Leak & Anomaly Detection</h2>
              <Badge variant="danger">{anomalies.length + materialAnomalies.length} issues</Badge>
            </div>
            <div className="grid gap-3">
              {[...anomalies, ...materialAnomalies].map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white border border-red-100 cursor-pointer hover:shadow-sm transition-all"
                  onClick={() => a.workOrderId && router.push(`/work-orders/${a.workOrderId}`)}
                >
                  <div className={`p-2 rounded-lg ${a.severity === "high" ? "bg-red-50 text-[#F45D5D]" : "bg-amber-50 text-[#FFB648]"}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{a.type.replace(/_/g, " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div data-tour="owner-kpis" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(kpis.totalRevenue || 0)}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 text-[#36B37E]"><DollarSign className="h-5 w-5" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Costs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(kpis.totalCosts || 0)}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50 text-[#F45D5D]"><Wallet className="h-5 w-5" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Net Profit</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(kpis.netProfit || 0)}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#EEF4FF] text-[#4F8EF7]"><Activity className="h-5 w-5" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Cash Burn Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(cashBurnRate)}</p>
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 mt-1">Monthly</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600"><Target className="h-5 w-5" /></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Smart Insights */}
      <Card data-tour="owner-insights" className="border-t-4 border-t-[#8B5CF6] bg-gradient-to-r from-purple-50 to-transparent">
        <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-[#8B5CF6]" /> Smart Business Insights</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(() => {
              const insights = []
              const lossMakingWOs = profitData.filter((wo: any) => wo.profit < 0)
              const delayedCount = kpis.delayed || 0
              if (lossMakingWOs.length > 0) insights.push({
                icon: <TrendingDown className="h-4 w-4" />,
                color: "bg-red-50 text-[#F45D5D]",
                message: `${lossMakingWOs.length} work orders are loss-making — review pricing and cost control`,
                severity: "high",
              })
              if (delayedCount > 0) insights.push({
                icon: <AlertTriangle className="h-4 w-4" />,
                color: "bg-amber-50 text-[#FFB648]",
                message: `${delayedCount} delayed work orders — investigate production bottlenecks`,
                severity: "medium",
              })
              if (prodStats.bottleneckCount > 0) insights.push({
                icon: <Factory className="h-4 w-4" />,
                color: "bg-red-50 text-[#F45D5D]",
                message: `${prodStats.bottleneckCount} production bottlenecks detected — check slow stages`,
                severity: "high",
              })
              if (emergencyPurchases.length > 2) insights.push({
                icon: <ShoppingCart className="h-4 w-4" />,
                color: "bg-amber-50 text-[#FFB648]",
                message: `${emergencyPurchases.length} emergency purchases — possible inventory planning failure`,
                severity: "medium",
              })
              if (kpis.profitMargin && kpis.profitMargin < 10) insights.push({
                icon: <DollarSign className="h-4 w-4" />,
                color: "bg-red-50 text-[#F45D5D]",
                message: `Profit margin at ${kpis.profitMargin.toFixed(1)}% — target should be 15%+`,
                severity: "high",
              })
              if (topSuppliers.length > 0) {
                const topSupplier = topSuppliers[0]
                insights.push({
                  icon: <Building2 className="h-4 w-4" />,
                  color: "bg-blue-50 text-[#4F8EF7]",
                  message: `Top supplier "${topSupplier[0]}" accounts for ${formatCurrency(topSupplier[1] as number)} — consider diversifying`,
                  severity: "low",
                })
              }
              if (insights.length === 0) insights.push({
                icon: <Activity className="h-4 w-4" />,
                color: "bg-green-50 text-[#36B37E]",
                message: "No issues detected — all metrics within normal range",
                severity: "low",
              })
              return insights
            })().map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100">
                <div className={`p-2 rounded-lg ${insight.color}`}>{insight.icon}</div>
                <p className="text-sm text-gray-700">{insight.message}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow + Production Stats */}
      <div data-tour="owner-cashflow" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-[#4F8EF7]" /> 12-Month Cash Flow</CardTitle></CardHeader>
          <CardContent>
            {cashFlow.monthlyCashFlow.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No cash flow data yet</p>
            ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow.monthlyCashFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="income" name="Income" radius={[4, 4, 0, 0]} fill="#36B37E" stackId="a" />
                  <Bar dataKey="expenses" name="Expenses" radius={[4, 4, 0, 0]} fill="#F45D5D" stackId="a" />
                  <Bar dataKey="payroll" name="Payroll" radius={[4, 4, 0, 0]} fill="#FFB648" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Financial Health</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-green-50">
                <p className="text-xs text-gray-500">Avg Monthly Income</p>
                <p className="text-lg font-bold text-[#36B37E]">{formatCurrency(avgMonthlyIncome)}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50">
                <p className="text-xs text-gray-500">Avg Monthly Expenses</p>
                <p className="text-lg font-bold text-[#F45D5D]">{formatCurrency(avgMonthlyExpenses)}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50">
                <p className="text-xs text-gray-500">Cash Burn Rate</p>
                <p className="text-lg font-bold text-[#FFB648]">{formatCurrency(cashBurnRate)}/mo</p>
              </div>
              <div className="p-3 rounded-xl bg-[#EEF4FF]">
                <p className="text-xs text-gray-500">Pending Receivables</p>
                <p className="text-lg font-bold text-[#4F8EF7]">{formatCurrency(cashFlow.summary?.totalPendingReceivables || 0)}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50">
                <p className="text-xs text-gray-500">Months of Runway</p>
                <p className="text-lg font-bold text-purple-600">{monthsOfRunway}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risks Section */}
      <div data-tour="owner-risks" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Risks */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-[#F45D5D]" /> Financial Risks</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profitData.filter((wo: any) => wo.profit < 0).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No financial risks detected</p>
              ) : (
                profitData.filter((wo: any) => wo.profit < 0).slice(0, 5).map((wo: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-red-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{wo.workOrderId || wo.id}</p>
                      <p className="text-xs text-gray-400">Budget: {formatCurrency(wo.budget)} | Actual: {formatCurrency(wo.actual)}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#F45D5D]">{formatCurrency(wo.profit)}</span>
                  </div>
                ))
              )}
              {cashFlow.pendingPayments?.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50">
                  <p className="text-sm font-medium text-amber-800">{cashFlow.pendingPayments.length} pending payments ({formatCurrency(cashFlow.summary?.totalPendingReceivables || 0)})</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Production Risks */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Factory className="h-5 w-5 text-[#FFB648]" /> Production Risks</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prodStats.bottleneckCount > 0 && (
                <div className="p-3 rounded-xl bg-red-50 mb-3">
                  <p className="text-sm font-medium text-[#F45D5D]">{prodStats.bottleneckCount} bottleneck stages detected</p>
                  <p className="text-xs text-gray-500">Completion rate: {prodStats.completionRate || 0}%</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-gray-50 text-center">
                  <p className="text-lg font-bold text-gray-900">{prodStats.totalStages || 0}</p>
                  <p className="text-xs text-gray-500">Total Stages</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 text-center">
                  <p className="text-lg font-bold text-gray-900">{prodStats.avgProductionTimeHours || 0}h</p>
                  <p className="text-xs text-gray-500">Avg Production Time</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 text-center">
                  <p className="text-lg font-bold text-gray-900">{prodStats.completionRate || 0}%</p>
                  <p className="text-xs text-gray-500">Stage Completion</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 text-center">
                  <p className="text-lg font-bold text-gray-900">{prodStats.delayedStages || 0}</p>
                  <p className="text-xs text-gray-500">Delayed Stages</p>
                </div>
              </div>
              {highRiskWOs.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">{highRiskWOs.length} work orders at risk</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div data-tour="owner-suppliers" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Analysis */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-[#4F8EF7]" /> Supplier Spending</CardTitle></CardHeader>
          <CardContent>
            {topSuppliers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No supplier data</p>
            ) : (
              <div className="space-y-2">
                {topSuppliers.map(([name, total], i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-sm font-semibold text-[#4F8EF7]">{formatCurrency(total as number)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Productivity */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#8B5CF6]" /> Activity by User</CardTitle></CardHeader>
          <CardContent>
            {productivityMap.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No activity data</p>
            ) : (
              <div className="space-y-2">
                {productivityMap.map(([name, data], i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Avatar name={name} size="sm" />
                      <p className="text-sm font-medium text-gray-900">{name}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#8B5CF6]">{data.count} actions</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Work Order Status</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3 mb-6">
              {statusData.map((s) => (
                <div key={s.name} className="text-center p-3 rounded-xl bg-gray-50">
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.name}</p>
                </div>
              ))}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Profit by Work Order</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profitData.slice(0, 6).map((wo: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.workOrderId}`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                    <p className="text-xs text-gray-400">Revenue: {formatCurrency(wo.revenue)} | Cost: {formatCurrency(wo.cost)}</p>
                  </div>
                  <span className={`text-sm font-semibold ${wo.profit >= 0 ? "text-[#36B37E]" : "text-[#F45D5D]"}`}>{formatCurrency(wo.profit)}</span>
                </div>
              ))}
              {profitData.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No data yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Material Cost Analysis */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-[#FFB648]" /> Material Cost Analytics</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-3 rounded-xl bg-red-50"><p className="text-xs text-gray-500">Overruns</p><p className="text-xl font-bold text-[#F45D5D]">{woWithCostOverruns.length}</p></div>
            <div className="p-3 rounded-xl bg-yellow-50"><p className="text-xs text-gray-500">Shortages</p><p className="text-xl font-bold text-[#FFB648]">{inventoryShortages.length}</p></div>
            <div className="p-3 rounded-xl bg-blue-50"><p className="text-xs text-gray-500">Emergency Purchases</p><p className="text-xl font-bold text-[#4F8EF7]">{emergencyPurchases.length}</p></div>
            <div className="p-3 rounded-xl bg-green-50"><p className="text-xs text-gray-500">Total Suppliers</p><p className="text-xl font-bold text-[#36B37E]">{topSuppliers.length}</p></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Highest Material Cost Work Orders</p>
              <div className="space-y-2">
                {topExpensiveWOs.map((wo: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.workOrderId}`)}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{wo.workOrderId}{wo.customerName ? <span className="text-xs text-gray-500 ml-1">— {wo.customerName}</span> : ""}</p>
                      <p className={`text-xs ${wo.actualCost > wo.estimatedCost ? "text-[#F45D5D]" : "text-[#36B37E]"}`}>
                        Est: {formatCurrency(wo.estimatedCost)} • Actual: {formatCurrency(wo.actualCost)}
                        {wo.estimatedCost > 0 && ` (${Math.round((wo.actualCost / wo.estimatedCost - 1) * 100)}%)`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(wo.actualCost)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Supplier Spending Analysis</p>
              <div className="space-y-2">
                {topSuppliers.map(([name, total], i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-sm font-semibold text-[#4F8EF7]">{formatCurrency(total as number)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Work Orders</CardTitle>
          <Button variant="outline" size="sm" onClick={() => router.push("/work-orders")}>View All</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">ID</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Customer</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Budget</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Cost</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Due</th>
                </tr>
              </thead>
              <tbody>
                {(workOrdersData?.workOrders || []).slice(0, 8).map((wo: any) => (
                  <tr key={wo.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                    <td className="py-3 px-4 font-medium text-gray-900">{wo.workOrderId}</td>
                    <td className="py-3 px-4 text-gray-700">{wo.customer?.name}</td>
                    <td className="py-3 px-4"><StatusBadge status={wo.status} /></td>
                    <td className="py-3 px-4 text-gray-700">{wo.estimatedBudget ? formatCurrency(wo.estimatedBudget) : "-"}</td>
                    <td className="py-3 px-4 text-gray-700">{wo.totalCost > 0 ? formatCurrency(wo.totalCost) : "-"}</td>
                    <td className="py-3 px-4 text-gray-700">{wo.dueDate ? formatDate(wo.dueDate) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 data-tour="owner-title" className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
            {activeTab === "overview" ? "Business Command Center" : "Deep Analytics"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {activeTab === "overview" 
              ? "Real-time business health, risks, and intelligent insights"
              : "Detailed financial and operational analytics"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <div data-tour="owner-tabs" className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <Button
              size="sm"
              variant={activeTab === "overview" ? "default" : "ghost"}
              onClick={() => setActiveTab("overview")}
            >
              <Activity className="h-4 w-4 mr-1" /> <span className="hidden xs:inline">Overview</span>
            </Button>
            <Button
              size="sm"
              variant={activeTab === "analytics" ? "default" : "ghost"}
              onClick={() => setActiveTab("analytics")}
            >
              <BarChart3 className="h-4 w-4 mr-1" /> <span className="hidden xs:inline">Analytics</span>
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/work-orders")}>
            <Eye className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">View All Orders</span>
          </Button>
        </div>
      </div>

      {activeTab === "overview" ? renderOverviewTab() : renderAnalyticsTab()}
    </div>
  )
}
