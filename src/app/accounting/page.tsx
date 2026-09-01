"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { formatCurrency, formatDate } from "@/lib/utils"
import { TrendingUp, TrendingDown, Download, Plus, Banknote, Landmark, FileCheck2, ArrowUpCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

const COLORS = ["#4F8EF7", "#36B37E", "#FFB648", "#F45D5D", "#8B5CF6", "#EC4899"]

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Landmark },
  { value: "CHEQUE", label: "Cheque", icon: FileCheck2 },
]

const paymentMethodLabel = (method?: string) =>
  PAYMENT_METHODS.find((m) => m.value === method)?.label || "Cash"

const methodFromPayment = (p: any) => {
  const match = p?.notes?.match(/Paid via (CASH|BANK_TRANSFER|CHEQUE)/)
  return match ? match[1] : (p?.reference ? "BANK_TRANSFER" : "CASH")
}

export default function AccountingPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"overview" | "expenses" | "payments" | "workorders">("overview")

  const { data: analytics } = useQuery({ queryKey: ["analytics"], queryFn: () => api.get<any>("/analytics") })
  const { data: expensesData } = useQuery({ queryKey: ["expenses"], queryFn: () => api.get<any>("/expenses") })
  const { data: paymentsData } = useQuery({ queryKey: ["payments"], queryFn: () => api.get<any>("/payments") })
  const { data: cashFlowData } = useQuery({ queryKey: ["cash-flow"], queryFn: () => api.get<any>("/cash-flow?months=12") })
  const { data: workOrdersData } = useQuery({ queryKey: ["accounting-work-orders"], queryFn: () => api.get<any>("/work-orders?limit=200&includePayments=true") })

  const kpis = analytics?.kpis || {}
  const expenses = expensesData?.expenses || []
  const payments = paymentsData?.payments || []
  const workOrders = workOrdersData?.workOrders || []

  const [paymentModal, setPaymentModal] = useState<{ workOrderId: string; workOrderNumber: string; customerName: string } | null>(null)
  const [payForm, setPayForm] = useState({ amount: "", method: "CASH", reference: "", notes: "" })

  const recordPaymentMutation = useMutation({
    mutationFn: (data: { workOrderId: string; amount: number; paymentMethod: string; reference?: string; notes?: string }) =>
      api.post("/installments", data),
    onSuccess: () => {
      toast.success("Payment recorded")
      setPaymentModal(null)
setPayForm({ amount: "", method: "CASH", reference: "", notes: "" })
      queryClient.invalidateQueries({ queryKey: ["accounting-work-orders"] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      queryClient.invalidateQueries({ queryKey: ["installments"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const openPaymentModal = (wo: any) => {
    setPaymentModal({ workOrderId: wo.id, workOrderNumber: wo.workOrderId, customerName: wo.customer?.name || "" })
    setPayForm({ amount: "", method: "CASH", reference: "", notes: "" })
  }

  const submitPayment = () => {
    if (!paymentModal) return
    const amount = parseFloat(payForm.amount)
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return }
    if (payForm.method !== "CASH" && !payForm.reference.trim()) {
      toast.error(`Reference number is required for ${paymentMethodLabel(payForm.method)} payments`)
      return
    }
    recordPaymentMutation.mutate({
      workOrderId: paymentModal.workOrderId,
      amount,
      paymentMethod: payForm.method,
      reference: payForm.reference.trim() || undefined,
      notes: payForm.notes.trim() || undefined,
    })
  }

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

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
        {["overview", "expenses", "payments", "workorders"].map((t) => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "workorders" ? "Work Orders" : t}
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
                    onClick={() => router.push(`/work-orders/${wo.id}`)}>
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

      {tab === "workorders" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-50 text-[#36B37E]">
                    <ArrowUpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Payments Received</p>
                    <p className="text-2xl font-bold text-[#36B37E] mt-0.5">
                      {formatCurrency(workOrders.reduce((s: number, wo: any) => s + (wo.advanceReceived || 0), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-[#4F8EF7]">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Job Value</p>
                    <p className="text-2xl font-bold text-[#4F8EF7] mt-0.5">
                      {formatCurrency(workOrders.reduce((s: number, wo: any) => s + (wo.estimatedBudget || wo.finalPrice || 0), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-50 text-[#F45D5D]">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Outstanding Balance</p>
                    <p className="text-2xl font-bold text-[#F45D5D] mt-0.5">
                      {formatCurrency(workOrders.reduce((s: number, wo: any) => s + (wo.remainingAmount ?? (wo.finalPrice ? Math.max(0, wo.finalPrice - (wo.advanceReceived || 0)) : 0)), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Work Order Payments</span>
                <p className="text-xs text-gray-400 font-normal">Click Add Payment to record cash, transfer, or cheque</p>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Work Order</th>
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Customer</th>
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Job Value</th>
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Advance Received</th>
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Remaining</th>
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Payment Details</th>
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Record Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workOrders.map((wo: any) => {
                      const jobValue = wo.estimatedBudget || wo.finalPrice || 0
                      const advance = wo.advanceReceived || 0
                      const remaining = wo.remainingAmount ?? (jobValue ? Math.max(0, jobValue - advance) : 0)
                      return (
                        <tr key={wo.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <button className="font-semibold text-[#4F8EF7] hover:underline text-left"
                              onClick={() => router.push(`/work-orders/${wo.id}`)}>
                              {wo.workOrderId}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{wo.customer?.name || "-"}</td>
                          <td className="py-3 px-4 text-gray-900">{formatCurrency(jobValue)}</td>
                          <td className="py-3 px-4 font-medium text-[#36B37E]">{formatCurrency(advance)}</td>
                          <td className="py-3 px-4 font-medium text-[#F45D5D]">{formatCurrency(remaining)}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              {(wo.payments || []).filter((p: any) => p.type === "INSTALLMENT").length === 0 ? (
                                <span className="text-xs text-gray-400">No payments yet</span>
                              ) : (
                                (wo.payments || [])
                                  .filter((p: any) => p.type === "INSTALLMENT")
                                  .slice(0, 3)
                                  .map((p: any) => (
                                    <div key={p.id} className="flex items-center gap-1.5 text-xs">
                                      <Badge className="bg-blue-50 text-[#4F8EF7]">{paymentMethodLabel(methodFromPayment(p))}</Badge>
                                      <span className="text-gray-600">{formatCurrency(p.amount)}</span>
                                      {p.reference && <span className="text-gray-400">· {p.reference}</span>}
                                    </div>
                                  ))
                              )}
                              {(wo.payments || []).filter((p: any) => p.type === "INSTALLMENT").length > 3 && (
                                <span className="text-[11px] text-gray-400">
                                  +{(wo.payments || []).filter((p: any) => p.type === "INSTALLMENT").length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Button size="sm" onClick={() => openPaymentModal(wo)}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add Payment
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Modal
        open={!!paymentModal}
        onClose={() => { setPaymentModal(null); setPayForm({ amount: "", method: "CASH", reference: "", notes: "" }) }}
        title="Record Payment"
        description={paymentModal ? `${paymentModal.workOrderNumber} · ${paymentModal.customerName || "Customer"}` : undefined}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon
              const active = payForm.method === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPayForm({ ...payForm, method: m.value, reference: "" })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${active ? "border-[#4F8EF7] bg-[#EEF4FF] text-[#4F8EF7]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  <Icon className="h-5 w-5" />
                  {m.label}
                </button>
              )
            })}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">Amount *</label>
            <Input
              type="number"
              step="0.01"
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          {payForm.method !== "CASH" && (
            <div className="space-y-1">
              <label className="text-xs text-gray-500">
                Reference Number * <span className="text-red-400">(required for {paymentMethodLabel(payForm.method).toLowerCase()})</span>
              </label>
              <Input
                value={payForm.reference}
                onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                placeholder={
                  payForm.method === "CHEQUE" ? "Cheque number..." : "Transaction / reference number..."
                }
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-gray-500">Notes</label>
            <Input
              value={payForm.notes}
              onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
              placeholder="Payment notes..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setPaymentModal(null)}>Cancel</Button>
            <Button className="flex-1" onClick={submitPayment} disabled={recordPaymentMutation.isPending}>
              {recordPaymentMutation.isPending ? "Saving..." : "Save Payment"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
