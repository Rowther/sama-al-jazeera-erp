"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Search, Plus, Phone, Mail, MapPin, User, Package, ShoppingCart } from "lucide-react"
import type { Supplier } from "@/types"

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", contactPerson: "", notes: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSuppliers() }, [])

  async function fetchSuppliers() {
    try {
      const res = await api.get<any>("/suppliers")
      setSuppliers(Array.isArray(res) ? res : res.suppliers || [])
    } catch { toast.error("Failed to load suppliers") }
    finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error("Supplier name is required"); return }
    setSaving(true)
    try {
      const res = await api.post<any>("/suppliers", form)
      setSuppliers(prev => [res.supplier || res, ...prev])
      setShowCreate(false)
      setForm({ name: "", phone: "", email: "", address: "", contactPerson: "", notes: "" })
      toast.success("Supplier created")
    } catch { toast.error("Failed to create supplier") }
    finally { setSaving(false) }
  }

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || "").includes(search) ||
    (s.contactPerson || "").toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">{suppliers.length} total suppliers</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search suppliers..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No suppliers found"
          description={search ? "Try a different search term" : "Add your first supplier"}
          action={!search ? <Button onClick={() => setShowCreate(true)}>Add Supplier</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(supplier => (
            <div key={supplier.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-[#F59E0B]" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{supplier.name}</h3>
              <div className="space-y-1.5 text-sm text-gray-500">
                {supplier.contactPerson && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    {supplier.contactPerson}
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {supplier.email}
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    {supplier.address}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Supplier" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name *</label>
            <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Contact Person</label>
            <Input value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Address</label>
            <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8EF7] min-h-[80px]"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Supplier"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Building2(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
}
