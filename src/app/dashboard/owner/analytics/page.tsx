"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { AlertTriangle, TrendingDown, DollarSign, Clock, Users, BarChart3, Lightbulb, ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts"

export default function AnalyticsPage() {
  const router = useRouter()

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get<any>("/analytics"),
  })

  const { data: workOrdersData } = useQuery({
    queryKey: ["work-orders"],
    queryFn: () => api.get<any>("/work-orders"),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" />
      </div>
    )
  }

  const workOrders = workOrdersData?.workOrders || []
  const anomalies = analytics?.anomalies || []
  const profitData = analytics?.profitByWO || []

  const highestCostWO = [...profitData].sort((a: any, b: any) => b.cost - a.cost).slice(0, 5)
  const lowestProfitWO = [...profitData].sort((a: any, b: any) => a.profit - b.profit).slice(0, 5)
  const delayedWO = workOrders.filter((w: any) => w.isDelayed)

  const insights = [
    ...anomalies,
    ...(delayedWO.length > 0 ? [{ type: "delay_analysis", severity: "medium" as const, message: `${delayedWO.length} work orders are currently delayed. Average delay: ${Math.round(delayedWO.reduce((s: number, w: any) => s + w.delayDays, 0) / delayedWO.length)} days` }] : []),
    ...(highestCostWO.length > 0 ? [{ type: "cost_analysis", severity: "medium" as const, message: `Highest spending work order: ${highestCostWO[0]?.workOrderId} at ${formatCurrency(highestCostWO[0]?.cost)}` }] : []),
    ...(lowestProfitWO.length > 0 && lowestProfitWO[0]?.profit < 0 ? [{ type: "loss_analysis", severity: "high" as const, message: `Work order ${lowestProfitWO[0]?.workOrderId} is running at a loss of ${formatCurrency(Math.abs(lowestProfitWO[0]?.profit))}` }] : []),
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Business Insights</h1>
          <p className="text-sm text-gray-500 mt-1">Intelligent analysis of business operations</p>
        </div>
      </div>

      {/* Critical Insights */}
      <Card className="border-red-100 bg-gradient-to-r from-red-50 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-[#FFB648]" />
            <h2 className="text-lg font-semibold text-gray-900">AI Detected Insights</h2>
            <Badge variant="danger">{insights.length} findings</Badge>
          </div>
          <div className="grid gap-3">
            {insights.map((insight: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100">
                <div className={`p-2 rounded-lg ${insight.severity === "high" ? "bg-red-50 text-[#F45D5D]" : insight.severity === "medium" ? "bg-amber-50 text-[#FFB648]" : "bg-blue-50 text-[#4F8EF7]"}`}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{insight.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{insight.type.replace(/_/g, " ")}</p>
                </div>
                {insight.workOrderId && (
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/work-orders/${insight.workOrderId}`)}>View</Button>
                )}
              </div>
            ))}
            {insights.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No issues detected. Business is running smoothly.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Profit/Loss by Work Order</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="workOrderId" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                    {profitData.slice(0, 10).map((_: any, i: number) => (
                      <Cell key={i} fill={profitData[i]?.profit >= 0 ? "#36B37E" : "#F45D5D"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cost Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={highestCostWO}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="workOrderId" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="cost" radius={[6, 6, 0, 0]} fill="#F45D5D" />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#36B37E" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Highest Cost Work Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highestCostWO.map((wo: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.workOrderId}`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                    <p className="text-xs text-gray-400">Revenue: {formatCurrency(wo.revenue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#F45D5D]">{formatCurrency(wo.cost)}</p>
                    <p className={`text-xs ${wo.profit >= 0 ? "text-[#36B37E]" : "text-[#F45D5D]"}`}>
                      {wo.profit >= 0 ? "+" : ""}{formatCurrency(wo.profit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Delayed Work Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {delayedWO.slice(0, 8).map((wo: any) => (
                <div key={wo.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-[#F45D5D]" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                      <p className="text-xs text-gray-400">{wo.customer?.name}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#F45D5D]">{wo.delayDays}d delayed</span>
                </div>
              ))}
              {delayedWO.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No delayed work orders</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
