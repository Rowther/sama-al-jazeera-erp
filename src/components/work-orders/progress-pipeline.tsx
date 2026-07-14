"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { formatDate, formatCurrency, formatDateTime } from "@/lib/utils"

interface Stage {
  key: string
  label: string
  icon: string
  status: "completed" | "in_progress" | "delayed" | "pending" | "blocked"
}

interface PipelineStageDetail {
  stage: Stage
  workOrder: any
}

const PIPELINE_STAGES: Stage[] = [
  { key: "CREATED", label: "Work Order Created", icon: "📋", status: "pending" },
  { key: "DESIGN", label: "Design", icon: "🎨", status: "pending" },
  { key: "MATERIAL_REVIEW", label: "Material Review", icon: "📦", status: "pending" },
  { key: "PROCUREMENT", label: "Procurement", icon: "🛒", status: "pending" },
  { key: "PRODUCTION", label: "Production", icon: "⚙️", status: "pending" },
  { key: "QUALITY_CHECK", label: "Quality Check", icon: "✅", status: "pending" },
  { key: "DELIVERY", label: "Delivery", icon: "🚚", status: "pending" },
]

function getPipelineStatus(workOrder: any): string {
  const status = workOrder?.status
  const isDelayed = workOrder?.isDelayed
  const stages: any[] = workOrder?.productionStages || []

  if (status === "DELIVERED" || status === "COMPLETED" || status === "CLOSED") return "DELIVERY"
  if (status === "PRODUCTION_COMPLETED" || status === "READY_FOR_DELIVERY") return "QUALITY_CHECK"
  if (["IN_PRODUCTION", "PRODUCTION_STARTED"].includes(status) || stages.some((s: any) => s.status === "IN_PROGRESS" || s.status === "COMPLETED")) return "PRODUCTION"
  if (status === "MATERIAL_REVIEW" || status === "READY_FOR_PRODUCTION" || status === "DESIGN_APPROVED") return "PROCUREMENT"
  if (["DESIGN_SUBMITTED", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "DESIGN_COMPLETED"].includes(status)) return "DESIGN"
  return "CREATED"
}

function getStageStatus(workOrder: any, stageKey: string): Stage["status"] {
  const pipelinePos = getPipelineStatus(workOrder)
  const currentIdx = PIPELINE_STAGES.findIndex(s => s.key === pipelinePos)
  const stageIdx = PIPELINE_STAGES.findIndex(s => s.key === stageKey)
  const isDelayed = workOrder?.isDelayed

  if (stageIdx < currentIdx) return "completed"
  if (stageIdx === currentIdx) {
    if (stageKey === "PRODUCTION") {
      const stages: any[] = workOrder?.productionStages || []
      if (stages.some((s: any) => s.isDelayed)) return "delayed"
    }
    if (isDelayed) return "delayed"
    return "in_progress"
  }
  if (stageIdx > currentIdx) return "pending"
  return "pending"
}

interface ProgressPipelineProps {
  workOrder: any
  onStageClick?: (stage: Stage) => void
  compact?: boolean
}

export function WorkOrderProgressBar({ workOrder }: { workOrder: any }) {
  const pct = useMemo(() => {
    if (!workOrder) return 0
    const stages: any[] = workOrder.productionStages || []
    if (stages.length > 0) {
      const completed = stages.filter((s: any) => s.status === "COMPLETED" || s.status === "SKIPPED").length
      return Math.round((completed / stages.length) * 100)
    }
    const statusMap: Record<string, number> = {
      DELIVERED: 100, COMPLETED: 100, CLOSED: 100, PRODUCTION_COMPLETED: 90,
      READY_FOR_DELIVERY: 85, IN_PRODUCTION: 60, PRODUCTION_STARTED: 50,
      MATERIAL_REVIEW: 40, READY_FOR_PRODUCTION: 38, DESIGN_APPROVED: 35,
      DESIGN_COMPLETED: 30, DESIGN_SUBMITTED: 25, DESIGN_ASSIGNED: 20,
      DESIGN_IN_PROGRESS: 15, APPROVED: 10, SUBMITTED: 5, DRAFT: 2,
      WORK_ORDER_CREATED: 3,
    }
    return statusMap[workOrder.status] || 0
  }, [workOrder])

  const getBarColor = () => {
    if (workOrder?.isDelayed) return "bg-red-500"
    if (pct >= 100) return "bg-green-500"
    if (pct >= 60) return "bg-[#4F8EF7]"
    if (pct >= 30) return "bg-[#FFB648]"
    return "bg-gray-300"
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Progress</span>
        <span className={cn("font-semibold", workOrder?.isDelayed ? "text-red-500" : "text-[#4F8EF7]")}>
          {pct}%
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getBarColor())}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function ProgressPipeline({ workOrder, onStageClick, compact }: ProgressPipelineProps) {
  const [selectedStage, setSelectedStage] = useState<PipelineStageDetail | null>(null)

  const pipelineStages = useMemo(() => {
    return PIPELINE_STAGES.map(stage => ({
      ...stage,
      status: getStageStatus(workOrder, stage.key),
    }))
  }, [workOrder])

  const handleStageClick = (stage: Stage) => {
    if (onStageClick) {
      onStageClick(stage)
    } else {
      setSelectedStage({ stage, workOrder })
    }
  }

  const activeIdx = pipelineStages.findIndex(s => s.status === "in_progress" || s.status === "delayed")

  return (
    <>
      <Card className={cn("border-t-4 border-t-[#4F8EF7]", compact ? "" : "")}>
        <CardContent className={cn("p-4", compact ? "p-3" : "p-5")}>
          {!compact && (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span>🏭</span> Production Pipeline
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Done</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#4F8EF7]" /> Active</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Delayed</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-200" /> Pending</span>
              </div>
            </div>
          )}

          <div className={cn("flex items-center gap-0 overflow-x-auto pb-2 scrollbar-hide", compact ? "justify-center" : "")}>
            {pipelineStages.map((stage, i) => {
              const isLast = i === pipelineStages.length - 1
              const isActive = i === activeIdx
              const isCompleted = stage.status === "completed"
              const isDelayed = stage.status === "delayed"
              const isPending = stage.status === "pending"
              const isBlocked = stage.status === "blocked"

              return (
                <div key={stage.key} className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => handleStageClick(stage)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all cursor-pointer min-w-[70px]",
                      isCompleted && "bg-green-50 hover:bg-green-100",
                      isActive && !isDelayed && "bg-[#EEF4FF] ring-2 ring-[#4F8EF7]",
                      isDelayed && "bg-red-50 ring-2 ring-red-400",
                      isPending && "bg-gray-50 hover:bg-gray-100",
                      isBlocked && "bg-red-50/50 ring-2 ring-red-300",
                    )}
                    title={stage.label}
                  >
                    <span className={cn(
                      "text-lg",
                      isPending && "opacity-40",
                      isBlocked && "opacity-50",
                    )}>
                      {stage.icon}
                    </span>
                    <span className={cn(
                      "text-[9px] font-medium text-center leading-tight",
                      isCompleted && "text-green-700",
                      isActive && !isDelayed && "text-[#4F8EF7]",
                      isDelayed && "text-red-600",
                      isPending && "text-gray-400",
                      isBlocked && "text-red-400",
                    )}>
                      {stage.label}
                    </span>
                    {isCompleted && (
                      <span className="text-[8px] text-green-600 font-semibold">✓ Done</span>
                    )}
                    {isActive && !isDelayed && (
                      <span className="text-[8px] text-[#4F8EF7] font-semibold">● Active</span>
                    )}
                    {isDelayed && (
                      <span className="text-[8px] text-red-600 font-semibold">⚠ Delayed</span>
                    )}
                    {isBlocked && (
                      <span className="text-[8px] text-red-400 font-semibold">⊘ Blocked</span>
                    )}
                    {isPending && (
                      <span className="text-[8px] text-gray-300">○</span>
                    )}
                  </button>
                  {!isLast && (
                    <div className={cn(
                      "w-6 h-0.5 mx-0.5",
                      isCompleted ? "bg-green-400" : isDelayed ? "bg-red-300" : "bg-gray-200",
                    )} />
                  )}
                </div>
              )
            })}
          </div>

          {!compact && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <WorkOrderProgressBar workOrder={workOrder} />
              {workOrder?.isDelayed && (
                <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <span>⚠</span>
                  <span>Delayed by {workOrder.delayDays || 0} day{workOrder.delayDays !== 1 ? "s" : ""}</span>
                  {workOrder.dueDate && (
                    <span className="text-red-400">
                      (Promise date: {formatDate(workOrder.dueDate)})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={!!selectedStage}
        onClose={() => setSelectedStage(null)}
        title={selectedStage?.stage.label || "Stage Details"}
        size="md"
      >
        {selectedStage && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedStage.stage.icon}</span>
              <div>
                <p className="text-lg font-semibold text-gray-900">{selectedStage.stage.label}</p>
                <Badge variant={
                  selectedStage.stage.status === "completed" ? "success" :
                  selectedStage.stage.status === "delayed" || selectedStage.stage.status === "blocked" ? "danger" :
                  selectedStage.stage.status === "in_progress" ? "primary" : "default"
                }>
                  {selectedStage.stage.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500">Work Order</p>
                <p className="text-sm font-medium">{selectedStage.workOrder?.workOrderId}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500">Customer</p>
                <p className="text-sm font-medium">{selectedStage.workOrder?.customer?.name}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium">{selectedStage.workOrder?.status?.replace(/_/g, " ")}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-500">Progress</p>
                <p className="text-sm font-medium">{selectedStage.workOrder?.delayDays ? `Delayed ${selectedStage.workOrder.delayDays}d` : "On Track"}</p>
              </div>
            </div>

            {selectedStage.stage.key === "PRODUCTION" && (selectedStage.workOrder?.productionStages?.length > 0) && (
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Production Stages</p>
                <div className="space-y-1">
                  {selectedStage.workOrder.productionStages.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          s.status === "COMPLETED" ? "bg-green-500" :
                          s.status === "IN_PROGRESS" ? "bg-[#4F8EF7]" :
                          s.isDelayed ? "bg-red-500" : "bg-gray-300"
                        }`} />
                        <span>{s.stageName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {s.assignedTo?.name && <span>{s.assignedTo.name}</span>}
                        {s.completionPercentage > 0 && <span>{s.completionPercentage}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSelectedStage(null)}>Close</Button>
              <Button onClick={() => {
                setSelectedStage(null)
                window.location.href = `/work-orders/${selectedStage.workOrder?.id}`
              }}>
                View Full Details
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

export function WorkOrderCard({ workOrder, onClick }: { workOrder: any; onClick?: () => void }) {
  const pipelinePos = getPipelineStatus(workOrder)
  const activeStageIndex = PIPELINE_STAGES.findIndex(s => s.key === pipelinePos)
  const isDelayed = workOrder?.isDelayed

  return (
    <div
      className={cn(
        "rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md bg-white",
        isDelayed ? "border-red-300 ring-1 ring-red-200" : "border-gray-100",
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{workOrder?.workOrderId}</p>
          <p className="text-xs text-gray-500">{workOrder?.customer?.name}</p>
        </div>
        {isDelayed && (
          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
            ⚠ {workOrder.delayDays || 0}d late
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 mb-2">
        {PIPELINE_STAGES.map((stage, i) => (
          <div
            key={stage.key}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < activeStageIndex ? "bg-green-400" :
              i === activeStageIndex && isDelayed ? "bg-red-400" :
              i === activeStageIndex ? "bg-[#4F8EF7]" : "bg-gray-200",
              i === activeStageIndex && isDelayed && "animate-pulse",
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>{workOrder?.furnitureType || workOrder?.projectType || "-"}</span>
        {workOrder?.dueDate && (
          <span className={cn(isDelayed ? "text-red-500 font-medium" : "")}>
            Due: {formatDate(workOrder.dueDate)}
          </span>
        )}
      </div>

      {(workOrder?.workerAssignments?.length > 0) && (
        <div className="flex items-center gap-1 mt-2">
          {workOrder.workerAssignments.slice(0, 3).map((w: any) => (
            <span key={w.id} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              {w.user?.name?.split(" ")[0]}
            </span>
          ))}
          {workOrder.workerAssignments.length > 3 && (
            <span className="text-[10px] text-gray-400">+{workOrder.workerAssignments.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}
