"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ShoppingCart, Plus, Search, Building2, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PurchasesPage() {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<any>({})
  const [tab, setTab] = useState<"purchases" | "suppliers">("purchases")
  const queryClient = useQueryClient()

  const { data: purchasesData } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => api.get<any>("/purchases"),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get<any>("/suppliers"),
  })

  const addPurchaseMutation = useMutation({
    mutationFn: (data: any) => api.post("/purchases", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["purchases"] }); setShowAdd(false); setForm({}) },
  })

  const addSupplierMutation = useMutation({
    mutationFn: (data: any) => api.post("/suppliers", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }) },
  })

  const purchases = purchasesData?.purchases || []
  const suppliers = suppliersData?.suppliers || []

  const totalPurchaseAmount = purchases.reduce((s: number, p: any) => s + p.amount, 0)
  const pendingPurchases = purchases.filter((p: any) => p.status === "PENDING")

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-sm text-gray-500 mt-1">{purchases.length} purchases • {formatCurrency(totalPurchaseAmount)} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTab("suppliers")}>
            <Building2 className="h-4 w-4 mr-1" /> Suppliers
          </Button>
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> New Purchase
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button onClick={() => setTab("purchases")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "purchases" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Purchase Orders
        </button>
        <button onClick={() => setTab("suppliers")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "suppliers" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Suppliers
        </button>
      </div>

      {showAdd && tab === "purchases" && (
        <Card>
          <CardHeader><CardTitle>New Purchase Order</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); addPurchaseMutation.mutate(form) }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Purchase Type</label>
                  <Select options={[{ value: "CASH", label: "Cash Purchase" }, { value: "LPO", label: "LPO Purchase" }]} onChange={(e) => setForm({ ...form, purchaseType: e.target.value })} placeholder="Select type" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Supplier</label>
                  <Select options={suppliers.map((s: any) => ({ value: s.id, label: s.name }))} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} placeholder="Select supplier" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Amount *</label>
                  <Input type="number" required onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Purchase amount" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">PO Number</label>
                  <Input onChange={(e) => setForm({ ...form, poNumber: e.target.value })} placeholder="Auto if empty" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea className="flex min-h-[60px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F8EF7]" onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit" disabled={addPurchaseMutation.isPending}>Create Purchase</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showAdd && tab === "suppliers" && (
        <Card>
          <CardHeader><CardTitle>Add Supplier</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); addSupplierMutation.mutate(form); setShowAdd(false) }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Name *</label>
                  <Input required onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <Input onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Contact Person</label>
                  <Input onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Contact person" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <textarea className="flex min-h-[60px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F8EF7]" onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit">Add Supplier</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Purchases List */}
      {tab === "purchases" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-4 px-4 text-gray-500 text-xs uppercase">PO Number</th>
                    <th className="text-left py-4 px-4 text-gray-500 text-xs uppercase">Type</th>
                    <th className="text-left py-4 px-4 text-gray-500 text-xs uppercase">Supplier</th>
                    <th className="text-left py-4 px-4 text-gray-500 text-xs uppercase">Amount</th>
                    <th className="text-left py-4 px-4 text-gray-500 text-xs uppercase">Status</th>
                    <th className="text-left py-4 px-4 text-gray-500 text-xs uppercase">Date</th>
                    <th className="text-left py-4 px-4 text-gray-500 text-xs uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{p.poNumber}</td>
                      <td className="py-3 px-4"><Badge variant={p.purchaseType === "LPO" ? "primary" : "default"}>{p.purchaseType}</Badge></td>
                      <td className="py-3 px-4 text-gray-700">{p.supplier?.name || "-"}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{formatCurrency(p.amount)}</td>
                      <td className="py-3 px-4"><StatusBadge status={p.status} /></td>
                      <td className="py-3 px-4 text-gray-700">{formatDate(p.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {p.billUrl && <Button variant="ghost" size="sm"><FileText className="h-3 w-3" /></Button>}
                          {p.invoiceUrl && <Button variant="ghost" size="sm"><FileText className="h-3 w-3" /></Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suppliers List */}
      {tab === "suppliers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s: any) => (
            <Card key={s.id} className="hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2.5 rounded-xl bg-[#EEF4FF]">
                    <Building2 className="h-5 w-5 text-[#4F8EF7]" />
                  </div>
                  <Badge>{s._count?.purchases || 0} orders</Badge>
                </div>
                <h3 className="text-base font-semibold text-gray-900">{s.name}</h3>
                {s.contactPerson && <p className="text-xs text-gray-400">Contact: {s.contactPerson}</p>}
                {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
                {s.address && <p className="text-xs text-gray-400 mt-1">{s.address}</p>}
                {s.notes && <p className="text-xs text-gray-400 mt-2 italic">{s.notes}</p>}
              </CardContent>
            </Card>
          ))}
          {suppliers.length === 0 && (
            <Card className="col-span-full"><CardContent className="p-12 text-center text-gray-400">No suppliers added yet</CardContent></Card>
          )}
        </div>
      )}
    </div>
  )
}
