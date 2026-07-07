"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { formatCurrency } from "@/lib/utils"
import { Package, Plus, Search, AlertTriangle, TrendingUp, Edit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"
import { useDebounce } from "@/hooks"
import { toast } from "sonner"
import { keepPreviousData } from "@tanstack/react-query"
import { INVENTORY_CATEGORIES } from "@/lib/constants"

const categoryOptions = [{ value: "", label: "All Categories" }, ...INVENTORY_CATEGORIES.map((c) => ({ value: c, label: c }))]

export default function InventoryPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [category, setCategory] = useState("")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<any>({})
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})
  const queryClient = useQueryClient()

  const queryParams = new URLSearchParams()
  queryParams.set("page", String(page))
  const trimmedSearch = debouncedSearch.trim()
  if (trimmedSearch) queryParams.set("search", trimmedSearch)
  if (category) queryParams.set("category", category)
  if (lowStockOnly) queryParams.set("lowStock", "true")

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["inventory", trimmedSearch, category, lowStockOnly, page],
    queryFn: () => api.get<any>(`/inventory?${queryParams.toString()}`),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })

  const showLoading = isLoading && !data

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post("/inventory", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); setShowAdd(false); setForm({}) },
  })

  const editMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/inventory/${editingItem.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setEditingItem(null)
      setEditForm({})
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      toast.success("Item deleted")
    },
  })

  const inventory = data?.inventory || []
  const pagination = data?.pagination

  const allItemsQuery = useQuery({
    queryKey: ["inventory-all"],
    queryFn: () => api.get<any>("/inventory?limit=200"),
    staleTime: 60000,
  })

  const allItems = allItemsQuery.data?.inventory || []
  const totalValue = allItems.reduce((s: number, i: any) => s + i.price * i.stockQuantity, 0)
  const lowStock = allItems.filter((i: any) => i.stockQuantity <= i.minStock)

  if (showLoading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination?.total || inventory.length} items • {formatCurrency(totalValue)} total value</p>
        </div>
        {(user?.role === "INVENTORY_MANAGER" || user?.role === "OWNER") && (
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        )}
      </div>

      {lowStock.length > 0 && !lowStockOnly && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[#FFB648]" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{lowStock.length} items</span> are below minimum stock level. Consider reordering.
            </p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => { setLowStockOnly(true); setSearch(""); setCategory("") }}>View Low Stock</Button>
          </CardContent>
        </Card>
      )}
      {lowStockOnly && (
        <Card className="border-[#4F8EF7] bg-blue-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[#4F8EF7]" />
            <p className="text-sm text-gray-700">
              Showing <span className="font-semibold">{inventory.length} low stock items</span>.
            </p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setLowStockOnly(false)}>Show All Items</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search items..." value={search} onChange={(e) => { setSearch(e.target.value); setLowStockOnly(false); setPage(1) }} className="pl-9" />
            </div>
            <Select options={categoryOptions} value={category} onChange={(e) => { setCategory(e.target.value); setLowStockOnly(false); setPage(1) }} placeholder="All Categories" className="w-48" />
          </div>
        </CardContent>
      </Card>

      {showAdd && (
        <Card>
          <CardHeader><CardTitle>Add Inventory Item</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(form) }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Name *</label>
                  <Input required onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Category *</label>
                  <Select required options={INVENTORY_CATEGORIES.map((c) => ({ value: c, label: c }))} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Select category" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">SKU</label>
                  <Input onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated if empty" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Unit *</label>
                  <Select required options={[{ value: "pcs", label: "Pieces" }, { value: "sqft", label: "Sq. Feet" }, { value: "kg", label: "Kg" }, { value: "meter", label: "Meter" }, { value: "liter", label: "Liter" }, { value: "box", label: "Box" }]} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Select unit" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Price *</label>
                  <Input type="number" required onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Unit price" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Stock Quantity</label>
                  <Input type="number" onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} placeholder="Initial stock" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Min Stock Level</label>
                  <Input type="number" onChange={(e) => setForm({ ...form, minStock: e.target.value })} placeholder="Reorder point" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Max Stock Level</label>
                  <Input type="number" onChange={(e) => setForm({ ...form, maxStock: e.target.value })} placeholder="Max stock" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <Input onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Storage location" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit" disabled={addMutation.isPending}>Add Item</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {inventory.map((item: any) => {
          const isLow = item.stockQuantity <= item.minStock
          const isOver = item.stockQuantity >= item.maxStock
          return (
            <Card key={item.id} className="hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={isLow ? "danger" : "success"}>{item.category?.name}</Badge>
                  {isLow && <Badge variant="warning">Low Stock</Badge>}
                </div>
                <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">SKU: {item.sku}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Stock:</span>
                    <span className={`font-medium ${isLow ? "text-[#F45D5D]" : "text-gray-900"}`}>
                      {item.stockQuantity} {item.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Price:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(item.price)}/{item.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Value:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(item.price * item.stockQuantity)}</span>
                  </div>
                  {item.location && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Location:</span>
                      <span className="text-gray-700">{item.location}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Min: {item.minStock} | Max: {item.maxStock}</span>
                  <div className="flex gap-1">
                    {(user?.role === "INVENTORY_MANAGER" || user?.role === "OWNER") && (
                      <>
                        <button onClick={() => { setEditingItem(item); setEditForm({ name: item.name, category: item.category?.name || "", sku: item.sku, unit: item.unit, price: String(item.price), stockQuantity: String(item.stockQuantity), minStock: String(item.minStock), maxStock: String(item.maxStock), location: item.location || "" }) }} className="p-1 rounded hover:bg-gray-100 text-[#4F8EF7]" title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { if (confirm("Delete this inventory item?")) deleteMutation.mutate(item.id) }} className="p-1 rounded hover:bg-gray-100 text-red-400" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <TrendingUp className="h-4 w-4 text-gray-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
          </span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {inventory.length === 0 && (
        <Card><CardContent className="p-12 text-center text-gray-400">No inventory items found</CardContent></Card>
      )}

      {/* Edit Modal */}
      <Modal open={!!editingItem} onClose={() => { setEditingItem(null); setEditForm({}) }} title="Edit Inventory Item" size="lg">
        {editingItem && (
          <form onSubmit={(e) => { e.preventDefault(); editMutation.mutate(editForm) }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Name *</label>
                <Input required value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Category *</label>
                <Select required options={INVENTORY_CATEGORIES.map((c) => ({ value: c, label: c }))} value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">SKU</label>
                <Input value={editForm.sku || ""} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Unit *</label>
                <Select required options={[{ value: "pcs", label: "Pieces" }, { value: "sqft", label: "Sq. Feet" }, { value: "kg", label: "Kg" }, { value: "meter", label: "Meter" }, { value: "liter", label: "Liter" }, { value: "box", label: "Box" }]} value={editForm.unit || ""} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Price *</label>
                <Input type="number" required value={editForm.price || ""} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Stock Quantity</label>
                <Input type="number" value={editForm.stockQuantity || ""} onChange={(e) => setEditForm({ ...editForm, stockQuantity: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Min Stock Level</label>
                <Input type="number" value={editForm.minStock || ""} onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Max Stock Level</label>
                <Input type="number" value={editForm.maxStock || ""} onChange={(e) => setEditForm({ ...editForm, maxStock: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Location</label>
                <Input value={editForm.location || ""} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setEditingItem(null); setEditForm({}) }}>Cancel</Button>
              <Button type="submit" disabled={editMutation.isPending}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
