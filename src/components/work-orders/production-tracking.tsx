"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { formatDateTime } from "@/lib/utils"
import { useAuthStore } from "@/stores/authStore"
import { Play, Pause, CheckCircle2, Clock, Calendar, Package } from "lucide-react"

interface ProductionTrackingProps {
  workOrderId: string
  currentStatus: string
  productionStartedAt?: string | null
  productionCompletedAt?: string | null
  workOrderItems?: { id: string; name: string; quantity: number; status: string; progress: number }[]
}

const productionStatuses = ["MATERIAL_REVIEW", "READY_FOR_PRODUCTION", "DESIGN_APPROVED", "IN_PRODUCTION", "PRODUCTION_STARTED", "PRODUCTION_COMPLETED"]

export function ProductionTracking({ workOrderId, currentStatus, productionStartedAt, productionCompletedAt, workOrderItems }: ProductionTrackingProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isProductionStatus = productionStatuses.includes(currentStatus)
  const [showItemSelect, setShowItemSelect] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [currentAction, setCurrentAction] = useState<string>("")

  const canManage = user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "PRODUCTION_MANAGER"

  const productionAction = useMutation({
    mutationFn: ({ action, itemIds }: { action: string; itemIds?: string[] }) =>
      api.post(`/work-orders/${workOrderId}/production`, { action, itemIds }),
    onSuccess: () => {
      toast.success("Production updated")
      setShowItemSelect(false)
      setSelectedItemIds([])
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
      queryClient.invalidateQueries({ queryKey: ["work-order-materials", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  if (!isProductionStatus && currentStatus !== "PRODUCTION_COMPLETED") return null

  const canStart = (currentStatus === "MATERIAL_REVIEW" || currentStatus === "READY_FOR_PRODUCTION" || currentStatus === "DESIGN_APPROVED")
  const canPause = (currentStatus === "IN_PRODUCTION" || currentStatus === "PRODUCTION_STARTED")
  const canComplete = (currentStatus === "IN_PRODUCTION" || currentStatus === "PRODUCTION_STARTED")
  const canResume = currentStatus === "MATERIAL_REVIEW"

  const pendingItems = (workOrderItems || []).filter(i => i.status === "PENDING" || i.status === "IN_PROGRESS")

  const handleAction = (action: string) => {
    if (pendingItems.length > 1 && (action === "START" || action === "COMPLETE")) {
      setCurrentAction(action)
      if (action === "START") {
        setSelectedItemIds(pendingItems.filter(i => i.status === "PENDING").map(i => i.id))
      } else {
        setSelectedItemIds(pendingItems.filter(i => i.status === "IN_PROGRESS").map(i => i.id))
      }
      setShowItemSelect(true)
    } else {
      productionAction.mutate({ action })
    }
  }

  const handleConfirmAction = () => {
    if (selectedItemIds.length === 0) {
      productionAction.mutate({ action: currentAction })
    } else {
      productionAction.mutate({ action: currentAction, itemIds: selectedItemIds })
    }
  }

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <>
      <Card className="border-t-4 border-t-[#FFB648]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-[#FFB648]" /> Production Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-500">Current Status</p>
              <StatusBadge status={currentStatus} />
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-500">Started</p>
              <p className="text-sm font-medium text-gray-900">{productionStartedAt ? formatDateTime(productionStartedAt) : "-"}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-sm font-medium text-gray-900">{productionCompletedAt ? formatDateTime(productionCompletedAt) : "-"}</p>
            </div>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              {canStart && (
                <Button onClick={() => handleAction("START")} disabled={productionAction.isPending}>
                  <Play className="h-4 w-4 mr-1" /> Start Production
                </Button>
              )}
              {canPause && (
                <Button variant="warning" onClick={() => handleAction("PAUSE")} disabled={productionAction.isPending}>
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              )}
              {canResume && (
                <Button onClick={() => handleAction("RESUME")} disabled={productionAction.isPending}>
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              )}
              {canComplete && (
                <Button variant="success" onClick={() => handleAction("COMPLETE")} disabled={productionAction.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Complete Production
                </Button>
              )}
              {currentStatus === "PRODUCTION_COMPLETED" && (
                <Badge variant="success" className="text-sm px-3 py-1">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Awaiting Digital Signature
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={showItemSelect} onClose={() => setShowItemSelect(false)} title={`Select Items to ${currentAction === "START" ? "Start" : "Complete"}`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {currentAction === "START"
              ? "Select which items to start production for. Unselected items will remain pending."
              : "Select which items to mark as complete. The work order will complete only when all items are done."}
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingItems.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedItemIds.includes(item.id)
                    ? "border-[#4F8EF7] bg-[#EEF4FF]"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedItemIds.includes(item.id)}
                  onChange={() => toggleItem(item.id)}
                  className="h-4 w-4 rounded border-gray-300 text-[#4F8EF7] focus:ring-[#4F8EF7]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    <span className="text-xs text-gray-400">×{item.quantity}</span>
                  </div>
                  <span className="text-xs text-gray-400">Status: {item.status} • Progress: {item.progress}%</span>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowItemSelect(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmAction}
              disabled={productionAction.isPending}
            >
              {productionAction.isPending ? "Processing..." : `${currentAction === "START" ? "Start" : "Complete"} Selected (${selectedItemIds.length || "All"})`}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
