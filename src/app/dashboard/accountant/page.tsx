"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, Receipt, ArrowRight, Download, ClipboardCheck, Filter, Search, Calendar, Package } from "lucide-react"
import { useRouter } from "next/navigation"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"

const COLORS = ["#4F8EF7", "#36B37E", "#FFB648", "#F45D5D", "#8B5CF6"]

const EXPENSE_CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "MATERIAL", label: "Material" },
  { value: "LABOUR", label: "Labour" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
]

export default function AccountantDashboard() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<"7" | "30" | "90" | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const { data: paymentsData } = useQuery({
    queryKey: ["payments"],
    queryFn: () => api.get<any>("/payments"),
  })

  const { data: expensesData } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => api.get<any>("/expenses"),
  })

  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get<any>("/analytics"),
  })

  const { data: workOrdersData } = useQuery({
    queryKey: ["work-orders"],
    queryFn: () => api.get<any>("/work-orders"),
  })

  const { data: pendingPurchasesData } = useQuery({
    queryKey: ["purchase-entries", "pending-approvals"],
    queryFn: () => api.get<any>("/purchase-entries?accountantView=true"),
  })

  const { data: installmentsData } = useQuery({
    queryKey: ["installments"],
    queryFn: () => api.get<any>("/installments"),
  })

  const payments = paymentsData?.payments || []
  const expenses = expensesData?.expenses || []
  const workOrders = workOrdersData?.workOrders || []
  const kpis = analytics?.kpis || {}
  const profitData = analytics?.profitByWO || []
  const installments = installmentsData?.installments || []

  const filteredExpenses = useMemo(() => {
    let result = [...expenses]
    if (categoryFilter) result = result.filter((e: any) => e.category === categoryFilter)
    if (dateRange !== "all") {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - parseInt(dateRange))
      result = result.filter((e: any) => new Date(e.date) >= cutoff)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((e: any) => e.description?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q))
    }
    return result
  }, [expenses, categoryFilter, dateRange, searchQuery])

  const filteredPayments = useMemo(() => {
    let result = [...payments]
    if (paymentFilter) result = result.filter((p: any) => p.status === paymentFilter)
    if (dateRange !== "all") {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - parseInt(dateRange))
      result = result.filter((p: any) => new Date(p.date) >= cutoff)
    }
    return result
  }, [payments, paymentFilter, dateRange])

  const totalInflow = payments.reduce((s: number, p: any) => s + (p.status === "PAID" ? p.amount : 0), 0)
  const totalOutflow = filteredExpenses.reduce((s: number, e: any) => s + e.amount, 0)
  const pendingPayments = payments.filter((p: any) => p.status === "PENDING")
  const pendingAmount = pendingPayments.reduce((s: number, p: any) => s + p.amount, 0)
  const receivables = workOrders.filter((w: any) => w.advanceReceived > 0 && w.status !== "CLOSED" && w.status !== "DELIVERED")
  const receivablesTotal = receivables.reduce((s: number, w: any) => s + (w.estimatedBudget || 0) - w.advanceReceived, 0)
  const totalInstallments = installments.reduce((s: number, i: any) => s + i.amount, 0)

  const pendingMaterialReview = workOrders.filter((w: any) => w.status === "MATERIAL_REVIEW")

  const pendingPurchases = pendingPurchasesData?.purchaseEntries || []
  const pendingPurchaseTotal = pendingPurchases.reduce((s: number, p: any) => s + p.totalCost, 0)

  const expenseByCategory = filteredExpenses.reduce((acc: any, e: any) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  const categoryData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" data-tour="accountant-title">Accountant Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Financial tracking and reporting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button size="sm" onClick={() => router.push("/accounting")}><Receipt className="h-4 w-4 mr-1" /> Reports</Button>
        </div>
      </div>

      {/* Filters */}
      <Card data-tour="accountant-filters">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select
              options={[
                { value: "all", label: "All Time" },
                { value: "7", label: "Last 7 Days" },
                { value: "30", label: "Last 30 Days" },
                { value: "90", label: "Last 90 Days" },
              ]}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-36"
            />
            <Select
              options={EXPENSE_CATEGORIES}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="All Categories"
              className="w-40"
            />
            <Select
              options={[
                { value: "", label: "All Payments" },
                { value: "PAID", label: "Paid" },
                { value: "PENDING", label: "Pending" },
                { value: "OVERDUE", label: "Overdue" },
              ]}
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              placeholder="All Payments"
              className="w-36"
            />
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4" data-tour="accountant-kpis">
        <Card><CardContent className="p-5">
          <p className="text-sm text-gray-500">Money In</p>
          <p className="text-2xl font-bold text-[#36B37E] mt-1">{formatCurrency(totalInflow)}</p>
          <span className="inline-flex items-center gap-1 text-xs text-[#36B37E] mt-1"><TrendingUp className="h-3 w-3" /> All time</span>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-gray-500">Money Out</p>
          <p className="text-2xl font-bold text-[#F45D5D] mt-1">{formatCurrency(totalOutflow)}</p>
          <span className="inline-flex items-center gap-1 text-xs text-[#F45D5D] mt-1"><TrendingDown className="h-3 w-3" /> Filtered period</span>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-gray-500">Pending Payments</p>
          <p className="text-2xl font-bold text-[#FFB648] mt-1">{formatCurrency(pendingAmount)}</p>
          <p className="text-xs text-gray-400 mt-1">{pendingPayments.length} payments pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-gray-500">Installments Collected</p>
          <p className="text-2xl font-bold text-[#8B5CF6] mt-1">{formatCurrency(totalInstallments)}</p>
          <p className="text-xs text-gray-400 mt-1">Across all work orders</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-gray-500">Expected Receivables</p>
          <p className="text-2xl font-bold text-[#4F8EF7] mt-1">{formatCurrency(receivablesTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">{receivables.length} outstanding orders</p>
        </CardContent></Card>
      </div>

      {/* Materials Pending Review */}
      {pendingMaterialReview.length > 0 && (
        <Card data-tour="accountant-material-review">
          <CardContent className="p-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-[#FFB648]" /> Materials Pending Review
              </p>
              {pendingMaterialReview.slice(0, 5).map((wo: any) => (
                <div key={wo.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                    <p className="text-xs text-gray-400">{wo.customer?.name}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Material Approvals */}
      <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => router.push("/dashboard/accountant/material-approvals")}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-[#FFB648]" />
              <div>
                <p className="text-sm font-medium text-gray-900">Pending Material Approvals</p>
                <p className="text-xs text-gray-400">{pendingPurchases.length} entries to review</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#FFB648]">{formatCurrency(pendingPurchaseTotal)}</p>
              <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-tour="accountant-charts">
          <CardHeader><CardTitle>Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: "Revenue", value: totalInflow }, { name: "Expenses", value: totalOutflow }, { name: "Net", value: totalInflow - totalOutflow }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {[{ fill: "#36B37E" }, { fill: "#F45D5D" }, { fill: "#4F8EF7" }].map((e, i) => <Cell key={i} {...e} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-tour="accountant-profit">
          <CardHeader><CardTitle>Profit by Work Order</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profitData.slice(0, 8).map((wo: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wo.id}</p>
                    <p className="text-xs text-gray-400">Cost: {formatCurrency(wo.cost)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(wo.revenue)}</p>
                    <p className={`text-xs ${wo.profit >= 0 ? "text-[#36B37E]" : "text-[#F45D5D]"}`}>
                      {wo.profit >= 0 ? "+" : ""}{formatCurrency(wo.profit)}
                    </p>
                  </div>
                </div>
              ))}
              {profitData.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No work order data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredPayments.slice(0, 10).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No payments found</p>
              )}
              {filteredPayments.slice(0, 10).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${p.type === "INCOME" ? "bg-green-50 text-[#36B37E]" : "bg-red-50 text-[#F45D5D]"}`}>
                      {p.type === "INCOME" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.type} - {p.workOrder?.workOrderId || "N/A"}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
