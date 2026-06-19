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
import { Plus, Search, Receipt, Filter } from "lucide-react"
import type { Expense } from "@/types"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ category: "", amount: "", description: "", workOrderId: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchExpenses() }, [page])

  async function fetchExpenses() {
    setLoading(true)
    try {
      const res = await api.get<any>(`/expenses?page=${page}&limit=50`)
      setExpenses(res.expenses || [])
      setTotal(res.total || 0)
    } catch { toast.error("Failed to load expenses") }
    finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category || !form.amount) { toast.error("Category and amount are required"); return }
    setSaving(true)
    try {
      await api.post("/expenses", { ...form, amount: parseFloat(form.amount) })
      toast.success("Expense recorded")
      setShowCreate(false)
      setForm({ category: "", amount: "", description: "", workOrderId: "" })
      fetchExpenses()
    } catch { toast.error("Failed to create expense") }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total expenses</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Record Expense" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Category *</label>
            <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Amount *</label>
            <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Work Order ID (optional)</label>
            <Input value={form.workOrderId} onChange={e => setForm({...form, workOrderId: e.target.value})} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Expense"}</Button>
          </div>
        </form>
      </Modal>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : expenses.length === 0 ? (
        <EmptyState icon={<Receipt className="h-7 w-7" />} title="No expenses" description="Record your first expense" />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {expenses.map(exp => (
              <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{exp.category}</p>
                  <p className="text-xs text-gray-400">{exp.description || exp.workOrderId ? `WO: ${exp.workOrderId}` : "No description"}</p>
                  <p className="text-xs text-gray-400">{formatDate(exp.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#F45D5D]">{formatCurrency(exp.amount)}</p>
                  {exp.approvedBy && <p className="text-xs text-gray-400">by {exp.approvedBy.name}</p>}
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
