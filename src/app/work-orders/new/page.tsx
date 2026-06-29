"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, X, Plus, Upload, Image as ImageIcon, Loader2 } from "lucide-react"
import { WORK_ORDER_STATUSES, PRIORITIES } from "@/lib/constants"

interface Item {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  description: string
  image: string
  dimensions: string
  notes: string
}

export default function NewWorkOrderPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", customerLocation: "",
    projectType: "", furnitureType: "", description: "",
    priority: "MEDIUM", dueDate: "", dimensions: "",
    notes: "", estimatedBudget: "", advanceReceived: "0", paymentTerms: "",
    status: "DRAFT", assignedToId: "",
  })
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState("")
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<any>("/users"),
  })

  const allUsers = usersData?.users || []
  const designers = allUsers.filter((u: any) => u.role === "DESIGNER")

  const addItem = () => {
    setItems([...items, { name: "", quantity: 1, unitPrice: 0, totalPrice: 0, description: "", image: "", dimensions: "", notes: "" }])
  }

  const updateItem = (index: number, key: string, value: string | number) => {
    const updated = [...items]
    ;(updated[index] as any)[key] = value
    if (key === "quantity" || key === "unitPrice") {
      const qty = key === "quantity" ? Number(value) : updated[index].quantity
      const price = key === "unitPrice" ? Number(value) : updated[index].unitPrice
      updated[index].totalPrice = qty * price
    }
    setItems(updated)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleImageUpload = async (index: number, file: File) => {
    setUploadingIndex(index)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await api.upload<{ url: string }>("/upload", formData)
      updateItem(index, "image", res.url)
      toast.success("Image uploaded")
    } catch (err) {
      toast.error("Failed to upload image")
    } finally {
      setUploadingIndex(null)
    }
  }

  const grandTotal = items.reduce((sum, item) => sum + item.totalPrice, 0)

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/work-orders", { ...data, items }),
    onSuccess: (res: any) => {
      toast.success("Work order created successfully")
      router.push(`/work-orders/${res.workOrder.id}`)
    },
    onError: (err: any) => setError(err.message),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    mutation.mutate(form)
  }

  const update = (key: string, value: string) => setForm({ ...form, [key]: value })

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">New Work Order</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new work order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Customer Name *</label>
                <Input value={form.customerName} onChange={(e) => update("customerName", e.target.value)} required placeholder="Enter customer name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone *</label>
                <Input value={form.customerPhone} onChange={(e) => update("customerPhone", e.target.value)} required placeholder="Enter phone number" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Location</label>
              <Input value={form.customerLocation} onChange={(e) => update("customerLocation", e.target.value)} placeholder="Enter location" />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>Work Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Project Type</label>
                <Select
                  options={[{ value: "Residential", label: "Residential" }, { value: "Commercial", label: "Commercial" }, { value: "Hotel", label: "Hotel" }, { value: "Office", label: "Office" }, { value: "Custom", label: "Custom" }]}
                  value={form.projectType}
                  onChange={(e) => update("projectType", e.target.value)}
                  placeholder="Select type"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Furniture Type</label>
                <Input value={form.furnitureType} onChange={(e) => update("furnitureType", e.target.value)} placeholder="e.g., Sofa, Cabinet, Table" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <Select
                  options={PRIORITIES.map((p: any) => ({ value: p.value, label: p.label }))}
                  value={form.priority}
                  onChange={(e) => update("priority", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Due Date</label>
                <Input type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select
                  options={WORK_ORDER_STATUSES.map((s: any) => ({ value: s.value, label: s.label }))}
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Assign Designer</label>
                <Select
                  options={designers.map((d: any) => ({ value: d.id, label: d.name }))}
                  value={form.assignedToId}
                  onChange={(e) => update("assignedToId", e.target.value)}
                  placeholder="Select designer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Dimensions</label>
              <Input value={form.dimensions} onChange={(e) => update("dimensions", e.target.value)} placeholder="e.g., 10x12 ft" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the work order..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No items added yet</p>}
            {items.map((item, i) => (
              <div key={i} className={`p-4 rounded-lg border-2 space-y-3 ${i % 2 === 0 ? "bg-gray-50 border-gray-300" : "bg-white border-gray-400"}`}>
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">Item #{i + 1}</span>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(i, "name", e.target.value)}
                        placeholder="Item name"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(i)}
                      >
                        <X className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>

                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                      placeholder="Item description..."
                      rows={2}
                    />

                    <div className="flex gap-2 flex-wrap">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Quantity</label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Unit Price</label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice}
                          onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-28"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Total</label>
                        <div className="h-10 flex items-center px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-900 w-28">
                          {item.totalPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Dimensions</label>
                        <Input
                          value={item.dimensions}
                          onChange={(e) => updateItem(i, "dimensions", e.target.value)}
                          placeholder="e.g., 10x12 ft"
                          className="w-28"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <div className="relative group">
                          <img
                            src={item.image}
                            alt="Item"
                            className="h-14 w-14 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(i, "image", "")}
                            className="absolute -top-1.5 -right-1.5 bg-red-400 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="h-14 w-14 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:border-[#4F8EF7] hover:bg-[#EEF4FF] transition-colors">
                          {uploadingIndex === i ? (
                            <Loader2 className="h-4 w-4 text-[#4F8EF7] animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 text-gray-400" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUpload(i, file)
                              e.target.value = ""
                            }}
                          />
                        </label>
                      )}
                      <span className="text-xs text-gray-400">Add image</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {items.length > 0 && (
              <div className="flex justify-end pt-2 border-t border-gray-200">
                <div className="text-right">
                  <span className="text-sm text-gray-500">Grand Total: </span>
                  <span className="text-lg font-bold text-gray-900">{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>Financial Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Estimated Budget</label>
                <Input type="number" value={form.estimatedBudget} onChange={(e) => update("estimatedBudget", e.target.value)} placeholder="Enter budget" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Advance Received</label>
                <Input type="number" value={form.advanceReceived} onChange={(e) => update("advanceReceived", e.target.value)} placeholder="Enter advance amount" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Payment Terms</label>
              <Input value={form.paymentTerms} onChange={(e) => update("paymentTerms", e.target.value)} placeholder="e.g., 50% advance, 50% on delivery" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Additional notes..." rows={2} />
            </div>
          </CardContent>
        </Card>

        {error && <div className="mt-4 bg-red-50 text-[#F45D5D] text-sm p-3 rounded-xl">{error}</div>}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Work Order"}
          </Button>
        </div>
      </form>
    </div>
  )
}
