"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, X, UserPlus, Plus } from "lucide-react"
import { WORK_ORDER_STATUSES, PRIORITIES } from "@/lib/constants"

export default function EditWorkOrderPage() {
  const router = useRouter()
  const params = useParams()
  const [form, setForm] = useState<any>(null)
  const [items, setItems] = useState<{ name: string; quantity: number; dimensions: string; notes: string; description: string }[]>([])
  const [teamMembers, setTeamMembers] = useState<{ userId: string; role: string }[]>([])
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(false)

  const { data: workOrderData, isLoading: woLoading } = useQuery({
    queryKey: ["work-order", params.id],
    queryFn: () => api.get<any>(`/work-orders/${params.id}`),
  })

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<any>("/users"),
  })

  const allUsers = usersData?.users || []
  const designers = allUsers.filter((u: any) => u.role === "DESIGNER")
  const workers = allUsers.filter((u: any) => u.role !== "OWNER" && u.role !== "MANAGER" && u.role !== "DESIGNER")

  const [selectedWorker, setSelectedWorker] = useState("")
  const [selectedWorkerRole, setSelectedWorkerRole] = useState("CARPENTER")

  // Populate form when data loads
  useEffect(() => {
    if (workOrderData?.workOrder && !loaded) {
      const wo = workOrderData.workOrder
      setForm({
        customerName: wo.customer?.name || "",
        customerPhone: wo.customer?.phone || "",
        customerLocation: wo.customer?.location || "",
        projectType: wo.projectType || "",
        furnitureType: wo.furnitureType || "",
        description: wo.description || "",
        priority: wo.priority || "MEDIUM",
        dueDate: wo.dueDate ? wo.dueDate.split("T")[0] : "",
        dimensions: wo.dimensions || "",
        notes: wo.notes || "",
        estimatedBudget: wo.estimatedBudget?.toString() || "",
        advanceReceived: wo.advanceReceived?.toString() || "0",
        paymentTerms: wo.paymentTerms || "",
        status: wo.status || "DRAFT",
        assignedToId: wo.assignedTo?.id || "",
      })
      if (wo.items) setItems(wo.items)
      if (wo.teamMembers) {
        setTeamMembers(
          wo.teamMembers
            .filter((tm: any) => tm.role !== "INVENTORY_MANAGER" && tm.role !== "ACCOUNTANT")
            .map((tm: any) => ({ userId: tm.user.id, role: tm.role }))
        )
      }
      setLoaded(true)
    }
  }, [workOrderData, loaded])

  const addWorker = () => {
    if (!selectedWorker) return
    if (teamMembers.find((tm) => tm.userId === selectedWorker)) return
    setTeamMembers([...teamMembers, { userId: selectedWorker, role: selectedWorkerRole }])
    setSelectedWorker("")
  }

  const removeWorker = (userId: string) => {
    setTeamMembers(teamMembers.filter((tm) => tm.userId !== userId))
  }

  const addItem = () => {
    setItems([...items, { name: "", quantity: 1, dimensions: "", notes: "", description: "" }])
  }

  const updateItem = (index: number, key: string, value: string | number) => {
    const updated = [...items]
    ;(updated[index] as any)[key] = value
    setItems(updated)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const mutation = useMutation({
    mutationFn: (data: any) => api.patch(`/work-orders/${params.id}`, { ...data, items, teamMembers }),
    onSuccess: () => {
      toast.success("Work order updated successfully")
      router.push(`/work-orders/${params.id}`)
    },
    onError: (err: any) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    mutation.mutate(form)
  }

  const update = (key: string, value: string) => setForm({ ...form, [key]: value })

  if (woLoading || !form) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" /></div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Work Order</h1>
          <p className="text-sm text-gray-500 mt-1">{workOrderData?.workOrder?.workOrderId}</p>
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
          <CardContent className="space-y-3">
            {items.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No items added yet</p>}
            {items.map((item, i) => (
              <div key={i} className={`flex gap-2 items-start p-3 rounded-lg border-2 ${i % 2 === 0 ? "bg-gray-50 border-gray-300" : "bg-white border-gray-400"}`}>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">Item #{i + 1}</span>
                    <Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} placeholder="Item name" className="flex-1" />
                  </div>
                  <Textarea
                    value={item.description || ""}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                    placeholder="Item description..."
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)} placeholder="Qty" className="w-20" />
                    <Input value={item.dimensions} onChange={(e) => updateItem(i, "dimensions", e.target.value)} placeholder="Dimensions" className="flex-1" />
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}>
                  <X className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>Team Members</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-400">Inventory Manager and Accountant are always included. Add or remove additional workers below.</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  options={workers.map((w: any) => ({ value: w.id, label: `${w.name} (${w.role})` }))}
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  placeholder="Select worker"
                />
              </div>
              <div className="w-40">
                <Select
                  options={[
                    { value: "CARPENTER", label: "Carpenter" },
                    { value: "ELECTRICIAN", label: "Electrician" },
                    { value: "PAINTER", label: "Painter" },
                    { value: "HELPER", label: "Helper" },
                    { value: "SUPERVISOR", label: "Supervisor" },
                  ]}
                  value={selectedWorkerRole}
                  onChange={(e) => setSelectedWorkerRole(e.target.value)}
                />
              </div>
              <Button type="button" variant="outline" onClick={addWorker} disabled={!selectedWorker}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            {teamMembers.length > 0 && (
              <div className="space-y-2 mt-2">
                {teamMembers.map((tm) => {
                  const user = allUsers.find((u: any) => u.id === tm.userId)
                  return (
                    <div key={tm.userId} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{user?.name || "Unknown"}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{tm.role}</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeWorker(tm.userId)}>
                        <X className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  )
                })}
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
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}