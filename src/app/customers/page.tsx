"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { toast } from "sonner"
import { Search, Plus, Phone, MapPin, Mail, Clock, User } from "lucide-react"
import type { Customer } from "@/types"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", email: "", location: "", notes: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    try {
      const res = await api.get<any>("/customers")
      setCustomers(Array.isArray(res) ? res : res.customers || [])
    } catch { toast.error("Failed to load customers") }
    finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.phone) { toast.error("Name and phone are required"); return }
    setSaving(true)
    try {
      const res = await api.post<any>("/customers", form)
      setCustomers(prev => [res.customer || res, ...prev])
      setShowCreate(false)
      setForm({ name: "", phone: "", email: "", location: "", notes: "" })
      toast.success("Customer created")
    } catch { toast.error("Failed to create customer") }
    finally { setSaving(false) }
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">{customers.length} total customers</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={search ? "Try a different search term" : "Create your first customer to get started"}
          action={!search ? <Button onClick={() => setShowCreate(true)}>Add Customer</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(customer => (
            <div key={customer.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-[#EEF4FF] flex items-center justify-center">
                  <User className="h-5 w-5 text-[#4F8EF7]" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{customer.name}</h3>
              <div className="space-y-1.5 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </div>
                )}
                {customer.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    {customer.location}
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                {new Date(customer.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Customer" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name *</label>
            <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Phone *</label>
            <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Location</label>
            <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
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
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Customer"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
