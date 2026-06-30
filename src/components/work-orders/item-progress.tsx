"use client"

import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Package, AlertTriangle, CheckCircle2, Play, User, Calendar, MessageSquare } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { WorkOrderItem, WorkOrderItemStatus } from "@/types"

const statusColors: Record<WorkOrderItemStatus, { border: string; bg: string; badge: "default" | "primary" | "success" | "warning" | "danger" }> = {
  PENDING: { border: "border-l-gray-300", bg: "bg-gray-50", badge: "default" },
  IN_PROGRESS: { border: "border-l-[#4F8EF7]", bg: "bg-blue-50/50", badge: "primary" },
  COMPLETED: { border: "border-l-[#36B37E]", bg: "bg-green-50/50", badge: "success" },
  DELAYED: { border: "border-l-[#F45D5D]", bg: "bg-red-50/50", badge: "danger" },
  CANCELLED: { border: "border-l-gray-400", bg: "bg-gray-50", badge: "default" },
}

const statusIcons: Record<WorkOrderItemStatus, React.ReactNode> = {
  PENDING: <Package className="h-4 w-4 text-gray-400" />,
  IN_PROGRESS: <Package className="h-4 w-4 text-[#4F8EF7]" />,
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-[#36B37E]" />,
  DELAYED: <AlertTriangle className="h-4 w-4 text-[#F45D5D]" />,
  CANCELLED: <Package className="h-4 w-4 text-gray-400" />,
}

interface ItemProgressProps {
  items: WorkOrderItem[]
  workOrderId?: string
  labourUsers?: { id: string; name: string; role: string }[]
  currentStatus?: string
}

export function ItemProgress({ items, workOrderId, labourUsers, currentStatus }: ItemProgressProps) {
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState<WorkOrderItem | null>(null)
  const [editLabourer, setEditLabourer] = useState("")
  const [editCompletionDate, setEditCompletionDate] = useState("")
  const [editDelayReason, setEditDelayReason] = useState("")

  const overallProgress = useMemo(() => {
    if (items.length === 0) return 0
    const total = items.reduce((sum, item) => sum + item.progress, 0)
    return Math.round(total / items.length)
  }, [items])

  const activeItems = items.filter(i => i.status === "IN_PROGRESS").length
  const completedItems = items.filter(i => i.status === "COMPLETED").length
  const delayedItems = items.filter(i => i.isDelayed).length

  const updateItemMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/work-orders/${workOrderId}/items`, data),
    onSuccess: () => {
      toast.success("Item updated")
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const productionAction = useMutation({
    mutationFn: ({ action, itemIds }: { action: string; itemIds: string[] }) =>
      api.post(`/work-orders/${workOrderId}/production`, { action, itemIds }),
    onSuccess: () => {
      toast.success("Item production updated")
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const handleOpenItem = (item: WorkOrderItem) => {
    setSelectedItem(item)
    setEditLabourer(item.assignedLabourerId || "")
    setEditCompletionDate(item.expectedCompletionDate ? item.expectedCompletionDate.split("T")[0] : "")
    setEditDelayReason(item.delayReason || "")
  }

  const handleSaveItem = () => {
    if (!selectedItem) return
    const data: any = { itemId: selectedItem.id }
    if (editLabourer !== (selectedItem.assignedLabourerId || "")) data.assignedLabourerId = editLabourer || null
    if (editCompletionDate !== (selectedItem.expectedCompletionDate?.split("T")[0] || "")) {
      data.expectedCompletionDate = editCompletionDate || null
    }
    if (editDelayReason !== (selectedItem.delayReason || "")) data.delayReason = editDelayReason || null

    const now = new Date()
    if (editCompletionDate && new Date(editCompletionDate) < now && selectedItem.status !== "COMPLETED") {
      data.isDelayed = true
      data.delayDays = Math.ceil((now.getTime() - new Date(editCompletionDate).getTime()) / (1000 * 60 * 60 * 24))
    } else {
      data.isDelayed = false
      data.delayDays = 0
    }

    updateItemMutation.mutate(data)
    setSelectedItem(null)
  }

  const now = new Date()

  return (
    <>
      <Card className="border-t-4 border-t-[#4F8EF7]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#4F8EF7]" /> Item-Level Progress
            </span>
            <div className="flex gap-2 text-sm font-normal">
              {activeItems > 0 && <Badge variant="primary">{activeItems} active</Badge>}
              {completedItems > 0 && <Badge variant="success">{completedItems} done</Badge>}
              {delayedItems > 0 && <Badge variant="danger">{delayedItems} delayed</Badge>}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No items in this work order</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {items.map((item) => {
                  const colors = statusColors[item.status]
                  const progressVariant = item.status === "COMPLETED" ? "success" : item.status === "DELAYED" ? "danger" : "default"
                  const isPastDue = item.expectedCompletionDate && new Date(item.expectedCompletionDate) < now && item.status !== "COMPLETED"

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${colors.border} ${colors.bg} cursor-pointer hover:shadow-sm transition-shadow`}
                      onClick={() => handleOpenItem(item)}
                    >
                      <div className="flex-shrink-0">
                        {statusIcons[item.status]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                            <span className="text-xs text-gray-400 ml-2">×{item.quantity}</span>
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <Badge variant={colors.badge}>{item.status.replace(/_/g, " ")}</Badge>
                            {item.isDelayed && (
                              <span className="text-xs text-[#F45D5D] flex items-center gap-1 whitespace-nowrap">
                                <AlertTriangle className="h-3 w-3" />
                                {item.delayDays}d
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={item.progress} variant={progressVariant} className="h-2" />
                          <span className={`text-xs w-8 text-right font-medium ${
                            item.progress === 100 ? "text-[#36B37E]" :
                            item.isDelayed ? "text-[#F45D5D]" :
                            "text-gray-500"
                          }`}>
                            {item.progress}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {item.assignedLabourer && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <User className="h-3 w-3" /> {item.assignedLabourer.name}
                            </span>
                          )}
                          {item.expectedCompletionDate && (
                            <span className={`text-xs flex items-center gap-1 ${
                              isPastDue ? "text-[#F45D5D]" : "text-gray-500"
                            }`}>
                              <Calendar className="h-3 w-3" /> Due: {formatDate(item.expectedCompletionDate)}
                            </span>
                          )}
                          {item.delayReason && (
                            <span className="text-xs text-[#F45D5D] flex items-center gap-1 truncate max-w-[200px]">
                              <MessageSquare className="h-3 w-3 flex-shrink-0" /> {item.delayReason}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="p-3 rounded-xl bg-gray-50">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span className="font-medium">Overall Progress</span>
                  <span className={`font-semibold ${
                    overallProgress === 100 ? "text-[#36B37E]" :
                    delayedItems > 0 ? "text-[#F45D5D]" :
                    "text-[#4F8EF7]"
                  }`}>
                    {overallProgress}%
                  </span>
                </div>
                <Progress
                  value={overallProgress}
                  variant={overallProgress === 100 ? "success" : delayedItems > 0 ? "danger" : "default"}
                  className="h-2.5"
                />
                <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                  <span>Total: {items.length} items</span>
                  <span>Completed: {completedItems}</span>
                  {delayedItems > 0 && <span className="text-[#F45D5D]">Delayed: {delayedItems}</span>}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal open={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.name || ""} size="md">
        {selectedItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500">Status</p>
                <Badge variant={statusColors[selectedItem.status].badge}>{selectedItem.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500">Quantity</p>
                <p className="text-sm font-semibold">×{selectedItem.quantity}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500">Progress</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={selectedItem.progress} className="h-2 flex-1" />
                  <span className="text-xs font-medium">{selectedItem.progress}%</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500">Delay</p>
                <p className={`text-sm font-semibold mt-1 ${selectedItem.isDelayed ? "text-[#F45D5D]" : "text-[#36B37E]"}`}>
                  {selectedItem.isDelayed ? `${selectedItem.delayDays}d delayed` : "On track"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 flex items-center gap-1"><User className="h-3 w-3" /> Assigned Labourer</label>
                <Select
                  options={[
                    { value: "", label: "Not assigned" },
                    ...(labourUsers || []).map((u: any) => ({ value: u.id, label: u.name })),
                  ]}
                  value={editLabourer}
                  onChange={(e) => setEditLabourer(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Expected Completion Date</label>
                <Input
                  type="date"
                  value={editCompletionDate}
                  onChange={(e) => setEditCompletionDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Delay Reason / Comments
                </label>
                <textarea
                  className="flex w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F8EF7] focus-visible:ring-offset-2 min-h-[80px]"
                  value={editDelayReason}
                  onChange={(e) => setEditDelayReason(e.target.value)}
                  placeholder="Why is this item delayed? Add any notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSelectedItem(null)}>Cancel</Button>
              <Button onClick={handleSaveItem} disabled={updateItemMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
