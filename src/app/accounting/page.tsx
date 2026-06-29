"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { TrendingUp, TrendingDown, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

const COLORS = ["#4F8EF7", "#36B37E", "#FFB648", "#F45D5D", "#8B5CF6", "#EC4899"]

export default function AccountingPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"overview" | "expenses" | "payments">("overview")

  const { data: analytics } = useQuery({ queryKey: ["analytics"], queryFn: () => api.get<any>("/analytics") })
  const { data: expensesData } = useQuery({ queryKey: ["expenses"], queryFn: () => api.get<any>("/expenses") })
  const { data: paymentsData } = useQuery({ queryKey: ["payments"], queryFn: () => api.get<any>("/payments") })
  const { data: cashFlowData } = useQuery({ queryKey: ["cash-flow"], queryFn: () => api.get<any>("/cash-flow?months=12") })

  const kpis = analytics?.kpis || {}
  const expenses = expensesData?.expenses || []
  const payments = paymentsData?.payments || []

  const expenseByCategory = expenses.reduce((acc: any, e: any) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})

  const categoryData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))

  const monthlyData = (cashFlowData?.monthlyCashFlow || []).map((m: any) => ({
    name: m.month ? m.month.split("-")[1] : "",
    revenue: m.income || 0,
    expenses: m.expenses + m.payroll || 0,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
          <p className="text-sm text-gray-500 mt-1">Financial overview and transaction management</p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-1" /> Export Report</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-[#36B37E] mt-1">{formatCurrency(kpis.totalRevenue || 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-[#F45D5D] mt-1">{formatCurrency(kpis.totalCosts || 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-gray-500">Net Profit</p>
          <p className={`text-2xl font-bold mt-1 ${(kpis.netProfit || 0) >= 0 ? "text-[#36B37E]" : "text-[#F45D5D]"}`}>{formatCurrency(kpis.netProfit || 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-gray-500">Profit Margin</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {kpis.totalRevenue ? ((kpis.netProfit / kpis.totalRevenue) * 100).toFixed(1) : 0}%
          </p>
        </CardContent></Card>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {["overview", "expenses", "payments"].map((t) => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Monthly Revenue vs Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#36B37E" name="Revenue" />
                      <Bar dataKey="expenses" radius={[6, 6, 0, 0]} fill="#F45D5D" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Expense Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData.length > 0 ? categoryData : [{ name: "No Data", value: 1 }]}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {(categoryData.length > 0 ? categoryData : [{ name: "No Data", value: 1 }]).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Profit by Work Order</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(analytics?.profitByWO || []).slice(0, 10).map((wo: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/work-orders/${wo.workOrderId}`)}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${wo.profit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                        {wo.profit >= 0 ? <TrendingUp className="h-4 w-4 text-[#36B37E]" /> : <TrendingDown className="h-4 w-4 text-[#F45D5D]" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                        <p className="text-xs text-gray-400">Revenue: {formatCurrency(wo.revenue)} | Cost: {formatCurrency(wo.cost)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(wo.profit)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "expenses" && (
        <Card>
          <CardHeader><CardTitle>All Expenses</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Category</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Work Order</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp: any) => (
                    <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4"><Badge variant="primary">{exp.category}</Badge></td>
                      <td className="py-3 px-4 text-gray-700">{exp.workOrder?.workOrderId || "-"}</td>
                      <td className="py-3 px-4 font-medium text-[#F45D5D]">{formatCurrency(exp.amount)}</td>
                      <td className="py-3 px-4 text-gray-700">{formatDate(exp.date)}</td>
                      <td className="py-3 px-4 text-gray-700">{exp.approvedBy?.name || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "payments" && (
        <Card>
          <CardHeader><CardTitle>All Payments</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Type</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Work Order</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4"><Badge variant={p.type === "INCOME" ? "success" : "danger"}>{p.type}</Badge></td>
                      <td className="py-3 px-4 text-gray-700">{p.workOrder?.workOrderId || "-"}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{formatCurrency(p.amount)}</td>
                      <td className="py-3 px-4"><StatusBadge status={p.status} /></td>
                      <td className="py-3 px-4 text-gray-700">{formatDate(p.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
