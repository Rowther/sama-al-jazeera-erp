"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { useAuthStore } from "@/stores/authStore"
import { formatDateTime } from "@/lib/utils"
import {
  Play, CheckCircle2, AlertTriangle, SkipForward, Clock,
  UserPlus, ChevronRight, ChevronDown, Image
} from "lucide-react"

interface ProductionStage {
  id: string
  stageName: string
  department?: string
  assignedTo?: { id: string; name: string; role: string } | null
  status: string
  startTime?: string
  endTime?: string
  duration?: number
  isDelayed: boolean
  delayMinutes: number
  completionPercentage: number
  notes?: string
  qualityStatus?: string
  sortOrder: number
}

interface Props {
  workOrderId: string
  stages: ProductionStage[]
  currentStatus: string
  labourUsers: any[]
  workOrderItems?: { id: string; name: string; quantity: number }[]
}

const stageIcons: Record<string, string> = {
  Cutting: "✂️",
  "Edge Banding": "📐",
  Assembly: "🔧",
  Sanding: "🪵",
  Painting: "🎨",
  Polishing: "✨",
  Upholstery: "🛋️",
  Installation: "🔨",
  "Quality Check": "✅",
  Packaging: "📦",
}

export function ProductionStages({ workOrderId, stages: initialStages, currentStatus, labourUsers, workOrderItems }: Props) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignStageId, setAssignStageId] = useState<string | null>(null)
  const [assignUserId, setAssignUserId] = useState("")
  const [showDelayModal, setShowDelayModal] = useState(false)
  const [delayStageId, setDelayStageId] = useState<string | null>(null)
  const [delayMinutes, setDelayMinutes] = useState(0)
  const [delayNotes, setDelayNotes] = useState("")
  const [selectedItemId, setSelectedItemId] = useState("")

  const { data: stagesData } = useQuery({
    queryKey: ["production-stages", workOrderId],
    queryFn: () => api.get<any>(`/work-orders/${workOrderId}/stages`),
    initialData: { stages: initialStages },
  })

  const stages = stagesData?.stages || initialStages

  const canManage = user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "PRODUCTION_MANAGER"
  const inProduction = ["IN_PRODUCTION", "PRODUCTION_STARTED", "MATERIAL_REVIEW"].includes(currentStatus)

  const stagesMutation = useMutation({
    mutationFn: (data: any) => api.post(`/work-orders/${workOrderId}/stages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-stages", workOrderId] })
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const initializeStages = (itemId?: string) => {
    stagesMutation.mutate({ action: "INITIALIZE", workOrderItemId: itemId || undefined }, {
      onSuccess: () => toast.success("Production stages initialized"),
    })
  }

  const completeStage = (stageId: string) => {
    stagesMutation.mutate({ action: "COMPLETE_STAGE", stageId }, {
      onSuccess: (res: any) => {
        toast.success(res.nextStageAutoStarted ? "Stage completed! Next stage auto-started" : "Stage completed")
      },
    })
  }

  const startStage = (stageId: string) => {
    stagesMutation.mutate({ action: "START_STAGE", stageId }, {
      onSuccess: () => toast.success("Stage started"),
    })
  }

  const handleDelayStage = () => {
    if (!delayStageId) return
    stagesMutation.mutate({
      action: "DELAY_STAGE",
      stageId: delayStageId,
      delayMinutes,
      notes: delayNotes,
    }, {
      onSuccess: () => {
        toast.success("Stage marked as delayed")
        setShowDelayModal(false)
        setDelayMinutes(0)
        setDelayNotes("")
      },
    })
  }

  const updateProgress = (stageId: string, progress: number) => {
    stagesMutation.mutate({ action: "UPDATE_PROGRESS", stageId, progress })
  }

  const assignWorkerToStage = () => {
    if (!assignStageId || !assignUserId) return
    stagesMutation.mutate({ action: "ASSIGN_WORKER", stageId: assignStageId, userId: assignUserId }, {
      onSuccess: () => {
        toast.success("Worker assigned to stage")
        setShowAssignModal(false)
        setAssignUserId("")
      },
    })
  }

  const pendingStages = stages.filter((s: ProductionStage) => s.status === "PENDING")
  const activeStages = stages.filter((s: ProductionStage) => s.status === "IN_PROGRESS")
  const completedStages = stages.filter((s: ProductionStage) => s.status === "COMPLETED" || s.status === "SKIPPED")
  const delayedStages = stages.filter((s: ProductionStage) => s.status === "DELAYED")

  if (!inProduction && stages.length === 0) {
    if (canManage && currentStatus === "MATERIAL_REVIEW") {
      return (
        <Card className="border-t-4 border-t-[#8B5CF6]">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-500 mb-3">No production stages initialized</p>
            {workOrderItems && workOrderItems.length > 0 && (
              <div className="mb-3 max-w-xs mx-auto">
                <Select
                  options={[
                    { value: "", label: "Entire Work Order" },
                    ...workOrderItems.map((i) => ({ value: i.id, label: `${i.name} (×${i.quantity})` })),
                  ]}
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                />
              </div>
            )}
            <Button onClick={() => initializeStages(selectedItemId || undefined)} disabled={stagesMutation.isPending}>
              <Play className="h-4 w-4 mr-1" /> Initialize Production Stages
            </Button>
          </CardContent>
        </Card>
      )
    }
    return null
  }

  if (stages.length === 0) return null

  const getStageColor = (stage: ProductionStage) => {
    if (stage.status === "COMPLETED") return "border-l-green-500 bg-green-50/50"
    if (stage.status === "IN_PROGRESS") return "border-l-[#4F8EF7] bg-blue-50/50"
    if (stage.status === "DELAYED") return "border-l-[#F45D5D] bg-red-50/50"
    if (stage.status === "SKIPPED") return "border-l-gray-400 bg-gray-50/50"
    return "border-l-gray-200 bg-white"
  }

  const getStatusIcon = (stage: ProductionStage) => {
    if (stage.status === "COMPLETED") return <CheckCircle2 className="h-5 w-5 text-green-500" />
    if (stage.status === "IN_PROGRESS") return <Play className="h-5 w-5 text-[#4F8EF7]" />
    if (stage.status === "DELAYED") return <AlertTriangle className="h-5 w-5 text-[#F45D5D]" />
    if (stage.status === "SKIPPED") return <SkipForward className="h-5 w-5 text-gray-400" />
    return <Clock className="h-5 w-5 text-gray-300" />
  }

  return (
    <Card className="border-t-4 border-t-[#8B5CF6]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Play className="h-5 w-5 text-[#8B5CF6]" /> Production Stages
          </span>
          <div className="flex gap-2 text-sm font-normal">
            <Badge variant="primary">{activeStages.length} active</Badge>
            <Badge variant="success">{completedStages.length} done</Badge>
            {delayedStages.length > 0 && <Badge variant="danger">{delayedStages.length} delayed</Badge>}
            <Badge variant="default">{pendingStages.length} pending</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Visual Pipeline */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {stages.map((stage: ProductionStage, i: number) => (
            <div key={stage.id} className="flex items-center gap-1 flex-shrink-0">
              <div
                className={`flex flex-col items-center p-2 rounded-xl min-w-[80px] cursor-pointer transition-all hover:shadow-sm ${
                  stage.status === "COMPLETED" ? "bg-green-100" :
                  stage.status === "IN_PROGRESS" ? "bg-[#EEF4FF] ring-2 ring-[#4F8EF7]" :
                  stage.status === "DELAYED" ? "bg-red-100" :
                  stage.status === "SKIPPED" ? "bg-gray-100" :
                  "bg-gray-50"
                }`}
                onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
              >
                <span className="text-lg">{stageIcons[stage.stageName] || "⚙️"}</span>
                <span className={`text-[10px] font-medium mt-1 text-center ${
                  stage.status === "COMPLETED" ? "text-green-700" :
                  stage.status === "IN_PROGRESS" ? "text-[#4F8EF7]" :
                  stage.status === "DELAYED" ? "text-[#F45D5D]" :
                  "text-gray-400"
                }`}>{stage.stageName}</span>
                <span className={`text-[8px] mt-0.5 ${
                  stage.status === "COMPLETED" ? "text-green-600" :
                  stage.status === "IN_PROGRESS" ? "text-[#4F8EF7]" :
                  stage.status === "DELAYED" ? "text-[#F45D5D]" :
                  "text-gray-400"
                }`}>{stage.status.replace(/_/g, " ")}</span>
              </div>
              {i < stages.length - 1 && (
                <ChevronRight className={`h-4 w-4 flex-shrink-0 ${
                  stage.status === "COMPLETED" ? "text-green-500" : "text-gray-300"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Detailed Stage List */}
        <div className="space-y-2">
          {stages.map((stage: ProductionStage) => (
            <div key={stage.id} className={`border-l-4 rounded-xl border ${getStageColor(stage)}`}>
              <div
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(stage)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {stage.stageName}
                      {stage.isDelayed && <span className="ml-2 text-xs text-[#F45D5D]">({stage.delayMinutes}m delayed)</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {stage.department || "No department"} 
                      {stage.assignedTo && ` • ${stage.assignedTo.name}`}
                      {stage.duration && ` • ${stage.duration} min`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {stage.status === "IN_PROGRESS" && (
                    <div className="flex gap-1">
                      {canManage && (
                        <>
                          <Button size="sm" variant="success" onClick={(e) => { e.stopPropagation(); completeStage(stage.id) }}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                          </Button>
                          <Button size="sm" variant="warning" onClick={(e) => { e.stopPropagation(); setDelayStageId(stage.id); setShowDelayModal(true) }}>
                            <AlertTriangle className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                  {stage.status === "PENDING" && canManage && (
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); startStage(stage.id) }}>
                      <Play className="h-3 w-3 mr-1" /> Start
                    </Button>
                  )}
                  {stage.status === "DELAYED" && canManage && (
                    <Button size="sm" variant="success" onClick={(e) => { e.stopPropagation(); completeStage(stage.id) }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                    </Button>
                  )}
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedStage === stage.id ? "rotate-180" : ""}`} />
                </div>
              </div>

              {expandedStage === stage.id && (
                <div className="px-3 pb-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-white">
                      <p className="text-[10px] text-gray-400">Status</p>
                      <p className="text-xs font-medium">{stage.status.replace(/_/g, " ")}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white">
                      <p className="text-[10px] text-gray-400">Progress</p>
                      <div className="flex items-center gap-1">
                        <Progress value={stage.completionPercentage} className="h-1.5" />
                        <span className="text-xs">{stage.completionPercentage}%</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white">
                      <p className="text-[10px] text-gray-400">Start Time</p>
                      <p className="text-xs font-medium">{stage.startTime ? formatDateTime(stage.startTime) : "-"}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white">
                      <p className="text-[10px] text-gray-400">End Time</p>
                      <p className="text-xs font-medium">{stage.endTime ? formatDateTime(stage.endTime) : "-"}</p>
                    </div>
                  </div>

                  {stage.status === "IN_PROGRESS" && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Progress Quick Set</p>
                      <div className="flex gap-1">
                        {[0, 25, 50, 75, 100].map((pct) => (
                          <Button
                            key={pct}
                            size="sm"
                            variant={stage.completionPercentage === pct ? "default" : "ghost"}
                            className="h-7 text-xs"
                            onClick={() => updateProgress(stage.id, pct)}
                          >
                            {pct}%
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setAssignStageId(stage.id); setShowAssignModal(true) }}>
                      <UserPlus className="h-3 w-3 mr-1" /> Assign Worker
                    </Button>
                    {stage.notes && (
                      <div className="p-2 rounded-lg bg-gray-50 flex-1">
                        <p className="text-xs text-gray-500">Notes</p>
                        <p className="text-xs text-gray-700">{stage.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        {stages.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Total: {stages.length} stages</span>
              <span>Completed: {completedStages.length}</span>
              <span>Active: {activeStages.length}</span>
              {delayedStages.length > 0 && <span className="text-[#F45D5D]">Delayed: {delayedStages.length}</span>}
            </div>
          </div>
        )}

        {/* Assign Worker Modal */}
        <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Worker to Stage" size="sm">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Worker</label>
              <Select
                options={labourUsers.map((u: any) => ({ value: u.id, label: u.name }))}
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                placeholder="Select worker"
              />
            </div>
            <Button className="w-full" onClick={assignWorkerToStage} disabled={!assignUserId}>
              <UserPlus className="h-4 w-4 mr-1" /> Assign to Stage
            </Button>
          </div>
        </Modal>

        {/* Delay Modal */}
        <Modal open={showDelayModal} onClose={() => setShowDelayModal(false)} title="Mark Stage as Delayed" size="sm">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Delay Duration (minutes)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                placeholder="30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Reason</label>
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={delayNotes}
                onChange={(e) => setDelayNotes(e.target.value)}
                placeholder="Why is this stage delayed?"
              />
            </div>
            <Button className="w-full" variant="warning" onClick={handleDelayStage}>
              <AlertTriangle className="h-4 w-4 mr-1" /> Mark as Delayed
            </Button>
          </div>
        </Modal>
      </CardContent>
    </Card>
  )
}
