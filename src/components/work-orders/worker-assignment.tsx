"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Progress } from "@/components/ui/progress"
import { useAuthStore } from "@/stores/authStore"
import { Users, UserPlus, Calendar, Clock, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface WorkerAssignmentProps {
  workOrderId: string
  workers: any[]
  labourUsers: any[]
  currentStatus: string
  workOrderItems?: { id: string; name: string; quantity: number }[]
}

export function WorkerAssignment({ workOrderId, workers, labourUsers, currentStatus, workOrderItems }: WorkerAssignmentProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [workerUserId, setWorkerUserId] = useState("")
  const [workerRole, setWorkerRole] = useState("CARPENTER")
  const [assignItemId, setAssignItemId] = useState("")
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("")
  const [delayReason, setDelayReason] = useState("")
  const [showLateComment, setShowLateComment] = useState<string | null>(null)
  const [lateComment, setLateComment] = useState("")

  const canAssign = (user?.role === "OWNER" || user?.role === "MANAGER") &&
    (currentStatus === "IN_PRODUCTION" || currentStatus === "PRODUCTION_STARTED")

  const assignMutation = useMutation({
    mutationFn: (data: { userId: string; role: string; workOrderItemId?: string }) =>
      api.post(`/work-orders/${workOrderId}/workers`, [{ ...data }]),
    onSuccess: () => {
      toast.success("Worker assigned")
      setShowAssignModal(false)
      setWorkerUserId("")
      setExpectedCompletionDate("")
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const updateItemMutation = useMutation({
    mutationFn: (data: { itemId: string; assignedLabourerId?: string; expectedCompletionDate?: string; delayReason?: string }) =>
      api.patch(`/work-orders/${workOrderId}/items`, data),
    onSuccess: () => {
      toast.success("Item updated")
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const updateProgressMutation = useMutation({
    mutationFn: ({ workerId, progress }: { workerId: string; progress: number }) =>
      api.patch(`/work-orders/${workOrderId}/workers`, { workerId, progress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const handleAssign = () => {
    assignMutation.mutate({ userId: workerUserId, role: workerRole, workOrderItemId: assignItemId || undefined })
    if (assignItemId && expectedCompletionDate) {
      updateItemMutation.mutate({ itemId: assignItemId, assignedLabourerId: workerUserId, expectedCompletionDate })
    }
  }

  const handleDelayReason = (itemId: string) => {
    updateItemMutation.mutate({ itemId, delayReason: lateComment, assignedLabourerId: undefined })
    setShowLateComment(null)
    setLateComment("")
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Users className="h-5 w-5 text-[#4F8EF7]" /> Assigned Workers</span>
            {canAssign && (
              <Button size="sm" variant="outline" onClick={() => setShowAssignModal(true)}>
                <UserPlus className="h-4 w-4 mr-1" /> Assign
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No workers assigned yet</p>
          ) : (
            <div className="space-y-3">
              {workers.map((w: any) => (
                <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="h-8 w-8 rounded-full bg-[#4F8EF7]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-[#4F8EF7]">
                      {w.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{w.user?.name}</p>
                    <p className="text-xs text-gray-400">
                      {w.role}
                      {w.workOrderItem && <span> • {w.workOrderItem.name}</span>}
                    </p>
                  </div>
                  <div className="w-24">
                    <div className="flex items-center gap-2">
                      <Progress value={w.progress} />
                      <span className="text-xs text-gray-500 w-8 text-right">{w.progress}%</span>
                    </div>
                  </div>
                  {canAssign && (
                    <div className="flex gap-1">
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <Button
                          key={pct}
                          size="sm"
                          variant={w.progress === pct ? "default" : "ghost"}
                          className="h-6 text-[10px] px-1.5"
                          onClick={() => updateProgressMutation.mutate({ workerId: w.id, progress: pct })}
                          disabled={updateProgressMutation.isPending}
                        >
                          {pct}%
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Worker" size="md">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Worker</label>
            <Select
              options={labourUsers.map((u: any) => ({ value: u.id, label: u.name }))}
              value={workerUserId}
              onChange={(e) => setWorkerUserId(e.target.value)}
              placeholder="Select worker"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Role</label>
            <Select
              options={[
                { value: "CARPENTER", label: "Carpenter" },
                { value: "PAINTER", label: "Painter" },
                { value: "FINISHER", label: "Finisher" },
                { value: "HELPER", label: "Helper" },
                { value: "ELECTRICIAN", label: "Electrician" },
                { value: "PLUMBER", label: "Plumber" },
                { value: "OTHER", label: "Other" },
              ]}
              value={workerRole}
              onChange={(e) => setWorkerRole(e.target.value)}
            />
          </div>
          {workOrderItems && workOrderItems.length > 0 && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Assign to Item (optional)</label>
                <Select
                  options={[
                    { value: "", label: "Entire Work Order" },
                    ...workOrderItems.map((i) => ({ value: i.id, label: `${i.name} (×${i.quantity})` })),
                  ]}
                  value={assignItemId}
                  onChange={(e) => setAssignItemId(e.target.value)}
                />
              </div>
              {assignItemId && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Expected Completion Date</label>
                  <Input
                    type="date"
                    value={expectedCompletionDate}
                    onChange={(e) => setExpectedCompletionDate(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
          <Button
            className="w-full"
            onClick={handleAssign}
            disabled={assignMutation.isPending || !workerUserId}
          >
            <UserPlus className="h-4 w-4 mr-1" /> Assign
          </Button>
        </div>
      </Modal>

      <Modal open={!!showLateComment} onClose={() => setShowLateComment(null)} title="Add Delay Comment" size="sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Reason for delay</label>
            <textarea
              className="flex w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F8EF7] focus-visible:ring-offset-2 min-h-[100px]"
              value={lateComment}
              onChange={(e) => setLateComment(e.target.value)}
              placeholder="Explain why this item is delayed..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowLateComment(null)}>Cancel</Button>
            <Button onClick={() => showLateComment && handleDelayReason(showLateComment)} disabled={!lateComment.trim()}>
              Save Comment
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
