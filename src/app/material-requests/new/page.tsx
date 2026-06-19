"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, X, Plus, Package } from "lucide-react"

interface RequestItem {
  name: string
  quantity: number
  unit: string
}

export default function NewMaterialRequestPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [items, setItems] = useState<RequestItem[]>([{ name: "", quantity: 1, unit: "pcs" }])
  const [error, setError] = useState("")

  const addItem = () => {
    setItems([...items, { name: "", quantity: 1, unit: "pcs" }])
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
    mutationFn: (data: any) => api.post("/material-requests", data),
    onSuccess: (res: any) => {
      toast.success("Material request sent for approval")
      router.push(`/material-requests/${res.materialRequest.id}`)
    },
    onError: (err: any) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!title.trim()) { setError("Title is required"); return }
    if (items.length === 0 || !items[0].name.trim()) { setError("At least one item is required"); return }
    mutation.mutate({ title, description, items: items.filter((i) => i.name.trim()) })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Material Request</h1>
          <p className="text-sm text-gray-500">Request materials that need to be purchased</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Urgent wood for Project X" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why are these materials needed?" rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Requested Materials</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-start p-3 rounded-lg bg-gray-50">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} placeholder="Material name" className="col-span-2" />
                  <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)} placeholder="Qty" />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} disabled={items.length === 1}>
                  <X className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {error && <div className="mt-4 bg-red-50 text-[#F45D5D] text-sm p-3 rounded-xl">{error}</div>}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending..." : "Send for Approval"}
          </Button>
        </div>
      </form>
    </div>
  )
}
