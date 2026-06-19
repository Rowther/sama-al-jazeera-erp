"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAuthStore } from "@/stores/authStore"
import { DollarSign, Users, Clock, TrendingUp, TrendingDown, Plus } from "lucide-react"

interface LaborEntry {
  id: string
  productionStageId?: string
  productionStage?: { stageName: string }
  worker: { id: string; name: string; role: string }
  hoursWorked: number
  hourlyRate: number
  overtimeHours: number
  overtimeRate: number
  totalCost: number
  date: string
  notes?: string
}

interface Props {
  workOrderId: string
  workers: any[]
  labourUsers: any[]
  stages: any[]
  currentStatus: string
  estimatedLaborCost?: number | null
  workOrderItems?: { id: string; name: string; quantity: number }[]
}

export function LaborCostTracking({ workOrderId, workers, labourUsers, stages, currentStatus, estimatedLaborCost, workOrderItems }: Props) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [workerId, setWorkerId] = useState("")
  const [stageId, setStageId] = useState("")
  const [hoursWorked, setHoursWorked] = useState(8)
  const [hourlyRate, setHourlyRate] = useState(30)
  const [overtimeHours, setOvertimeHours] = useState(0)
  const [notes, setNotes] = useState("")
  const [laborItemId, setLaborItemId] = useState("")

  const { data: laborData } = useQuery({
    queryKey: ["labor-entries", workOrderId],
    queryFn: () => api.get<any>(`/work-orders/${workOrderId}/labor`),
  })

  const entries: LaborEntry[] = laborData?.entries || []
  const totalLaborCost = laborData?.totalLaborCost || 0

  const canManage = user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "PRODUCTION_MANAGER"
  const isActive = currentStatus !== "DELIVERED" && currentStatus !== "CLOSED" && currentStatus !== "CANCELLED"

  const addEntryMutation = useMutation({
    mutationFn: (data: any) => api.post(`/work-orders/${workOrderId}/labor`, data),
    onSuccess: (res: any) => {
      toast.success("Labor entry added")
      setShowAddModal(false)
      setWorkerId("")
      setStageId("")
      setOvertimeHours(0)
      setNotes("")
      queryClient.invalidateQueries({ queryKey: ["labor-entries", workOrderId] })
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const handleAddEntry = () => {
    if (!workerId || !hoursWorked) {
      toast.error("Worker and hours required")
      return
    }
    addEntryMutation.mutate({
      action: "ADD_ENTRY",
      workerId,
      productionStageId: stageId || undefined,
      hoursWorked,
      hourlyRate,
      overtimeHours,
      notes: notes || undefined,
      workOrderItemId: laborItemId || undefined,
    })
  }

  const totalWorkerHours = [...new Set(entries.map((e) => e.worker.id))].length
  const totalHours = entries.reduce((s, e) => s + e.hoursWorked + e.overtimeHours, 0)
  const avgRate = entries.length > 0 ? totalLaborCost / totalHours : 0
  const costVsEstimate = estimatedLaborCost ? ((totalLaborCost / estimatedLaborCost) * 100).toFixed(0) : null

  if (!canManage && entries.length === 0) return null

  return (
    <>
      <Card className="border-t-4 border-t-[#F45D5D]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#F45D5D]" /> Labor Cost Tracking
            </span>
            {canManage && isActive && (
              <Button size="sm" variant="outline" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Hours
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-red-50">
              <p className="text-xs text-gray-500">Total Labor Cost</p>
              <p className="text-lg font-bold text-[#F45D5D]">{formatCurrency(totalLaborCost)}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50">
              <p className="text-xs text-gray-500">Total Hours</p>
              <p className="text-lg font-bold text-[#4F8EF7]">{totalHours.toFixed(1)}h</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50">
              <p className="text-xs text-gray-500">Workers</p>
              <p className="text-lg font-bold text-purple-600">{totalWorkerHours}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50">
              <p className="text-xs text-gray-500">Avg Rate</p>
              <p className="text-lg font-bold text-[#FFB648]">{formatCurrency(avgRate)}/hr</p>
            </div>
          </div>

          {/* Cost vs Estimate */}
          {costVsEstimate && (
            <div className="mb-4 p-3 rounded-xl bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Labor Cost vs Estimate</span>
                <span className={`text-xs font-medium ${Number(costVsEstimate) > 100 ? "text-[#F45D5D]" : "text-[#36B37E]"}`}>
                  {Number(costVsEstimate) > 100 ? <TrendingUp className="h-3 w-3 inline mr-1" /> : <TrendingDown className="h-3 w-3 inline mr-1" />}
                  {costVsEstimate}% of {formatCurrency(estimatedLaborCost || 0)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${Number(costVsEstimate) > 100 ? "bg-[#F45D5D]" : Number(costVsEstimate) > 80 ? "bg-[#FFB648]" : "bg-[#36B37E]"}`}
                  style={{ width: `${Math.min(Number(costVsEstimate), 200)}%` }}
                />
              </div>
            </div>
          )}

          {/* Labor Entries */}
          {entries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No labor entries recorded</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#F45D5D]/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-[#F45D5D]">{entry.worker.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.worker.name}</p>
                      <p className="text-xs text-gray-400">
                        {entry.hoursWorked}h × {formatCurrency(entry.hourlyRate)}/hr
                        {entry.overtimeHours > 0 && ` + ${entry.overtimeHours}h OT`}
                        {entry.productionStage && ` • ${entry.productionStage.stageName}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#F45D5D]">{formatCurrency(entry.totalCost)}</p>
                    <p className="text-xs text-gray-400">{formatDate(entry.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Labor Entry Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Labor Hours" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Worker *</label>
              <Select
                options={labourUsers.map((u: any) => ({ value: u.id, label: u.name }))}
                value={workerId}
                onChange={(e) => {
                  setWorkerId(e.target.value)
                  const worker = labourUsers.find((u: any) => u.id === e.target.value)
                  if (worker?.hourlyRate) setHourlyRate(worker.hourlyRate)
                  else if (worker?.employee?.salary) setHourlyRate(Math.round(worker.employee.salary / 30 / 8))
                }}
                placeholder="Select worker"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Production Stage</label>
              <Select
                options={[
                  { value: "", label: "General (no stage)" },
                  ...(stages || []).map((s: any) => ({ value: s.id, label: s.stageName })),
                ]}
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
              />
            </div>
            {workOrderItems && workOrderItems.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Work Order Item</label>
                <Select
                  options={[
                    { value: "", label: "Entire Work Order" },
                    ...workOrderItems.map((i) => ({ value: i.id, label: `${i.name} (×${i.quantity})` })),
                  ]}
                  value={laborItemId}
                  onChange={(e) => setLaborItemId(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Hours Worked</label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(Number(e.target.value))}
                min={0}
                max={24}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Hourly Rate (AED)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Overtime Hours</label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Notes</label>
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>
          {workerId && hoursWorked > 0 && (
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-sm text-gray-500">
                Regular: {hoursWorked}h × {formatCurrency(hourlyRate)} = {formatCurrency(hoursWorked * hourlyRate)}
                {overtimeHours > 0 && ` | OT: ${overtimeHours}h × ${formatCurrency(hourlyRate * 1.5)} = ${formatCurrency(overtimeHours * hourlyRate * 1.5)}`}
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                Total: {formatCurrency(hoursWorked * hourlyRate + overtimeHours * hourlyRate * 1.5)}
              </p>
            </div>
          )}
          <Button
            className="w-full"
            onClick={handleAddEntry}
            disabled={addEntryMutation.isPending || !workerId || !hoursWorked}
          >
            <Plus className="h-4 w-4 mr-1" /> Record Labor Entry
          </Button>
        </div>
      </Modal>
    </>
  )
}
