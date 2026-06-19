"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import { useAuthStore } from "@/stores/authStore"
import { Play, Pause, CheckCircle2, Clock, Calendar } from "lucide-react"

interface ProductionTrackingProps {
  workOrderId: string
  currentStatus: string
  productionStartedAt?: string | null
  productionCompletedAt?: string | null
}

const productionStatuses = ["MATERIAL_REVIEW", "READY_FOR_PRODUCTION", "DESIGN_APPROVED", "IN_PRODUCTION", "PRODUCTION_STARTED", "PRODUCTION_COMPLETED"]

export function ProductionTracking({ workOrderId, currentStatus, productionStartedAt, productionCompletedAt }: ProductionTrackingProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isProductionStatus = productionStatuses.includes(currentStatus)

  const canManage = user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "PRODUCTION_MANAGER"

  const productionAction = useMutation({
    mutationFn: (action: string) => api.post(`/work-orders/${workOrderId}/production`, { action }),
    onSuccess: () => {
      toast.success("Production updated")
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  if (!isProductionStatus && currentStatus !== "PRODUCTION_COMPLETED") return null

  const canStart = (currentStatus === "MATERIAL_REVIEW" || currentStatus === "READY_FOR_PRODUCTION" || currentStatus === "DESIGN_APPROVED")
  const canPause = (currentStatus === "IN_PRODUCTION" || currentStatus === "PRODUCTION_STARTED")
  const canComplete = (currentStatus === "IN_PRODUCTION" || currentStatus === "PRODUCTION_STARTED")
  const canResume = currentStatus === "MATERIAL_REVIEW"

  return (
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
              <Button onClick={() => productionAction.mutate("START")} disabled={productionAction.isPending}>
                <Play className="h-4 w-4 mr-1" /> Start Production
              </Button>
            )}
            {canPause && (
              <Button variant="warning" onClick={() => productionAction.mutate("PAUSE")} disabled={productionAction.isPending}>
                <Pause className="h-4 w-4 mr-1" /> Pause
              </Button>
            )}
            {canResume && (
              <Button onClick={() => productionAction.mutate("RESUME")} disabled={productionAction.isPending}>
                <Play className="h-4 w-4 mr-1" /> Resume
              </Button>
            )}
            {canComplete && (
              <Button variant="success" onClick={() => productionAction.mutate("COMPLETE")} disabled={productionAction.isPending}>
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
  )
}
