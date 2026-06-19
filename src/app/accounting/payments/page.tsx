"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Pagination } from "@/components/ui/pagination"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { Plus, CreditCard, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import type { Payment } from "@/types"

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ type: "INCOME", amount: "", reference: "", notes: "", workOrderId: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchPayments() }, [page])

  async function fetchPayments() {
    setLoading(true)
    try {
      const res = await api.get<any>(`/payments?page=${page}&limit=50`)
      setPayments(res.payments || [])
      setTotal(res.total || 0)
    } catch { toast.error("Failed to load payments") }
    finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount) { toast.error("Amount is required"); return }
    setSaving(true)
    try {
      await api.post("/payments", { ...form, amount: parseFloat(form.amount) })
      toast.success("Payment recorded")
      setShowCreate(false)
      setForm({ type: "INCOME", amount: "", reference: "", notes: "", workOrderId: "" })
      fetchPayments()
    } catch { toast.error("Failed to create payment") }
    finally { setSaving(false) }
  }

  const statusColors: Record<string, string> = {
    PAID: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-700",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total payments</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Payment
        </Button>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Record Payment" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]"
            >
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="ADVANCE">Advance</option>
              <option value="DEPOSIT">Deposit</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Amount *</label>
            <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Reference</label>
            <Input value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Work Order ID (optional)</label>
            <Input value={form.workOrderId} onChange={e => setForm({...form, workOrderId: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Payment"}</Button>
          </div>
        </form>
      </Modal>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : payments.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-7 w-7" />} title="No payments" description="Record your first payment" />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {payments.map(pmt => (
              <div key={pmt.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${pmt.type === "INCOME" ? "bg-green-50" : "bg-red-50"}`}>
                    {pmt.type === "INCOME" ? <ArrowDownCircle className="h-4 w-4 text-green-600" /> : <ArrowUpCircle className="h-4 w-4 text-red-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pmt.type}</p>
                    <p className="text-xs text-gray-400">{pmt.reference || "No reference"} · {formatDate(pmt.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${pmt.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                    {pmt.type === "INCOME" ? "+" : "-"}{formatCurrency(pmt.amount)}
                  </span>
                  <Badge className={statusColors[pmt.status] || "bg-gray-100 text-gray-700"}>
                    {pmt.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-50">
            <Pagination page={page} limit={50} total={total} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  )
}
