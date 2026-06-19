"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { useAuthStore } from "@/stores/authStore"
import { ShieldCheck, ShieldAlert, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"

interface PurchaseApproval {
  id: string
  purchaseEntryId: string
  purchaseEntry?: { id: string; supplierName?: string; totalCost: number; purchaseType: string }
  requestedBy: { id: string; name: string }
  approvedBy?: { id: string; name: string }
  status: string
  amount: number
  threshold: number
  notes?: string
  approvedAt?: string
  rejectedReason?: string
}

interface Props {
  workOrderId: string
  purchaseEntries: any[]
  currentStatus: string
}

export function PurchaseApprovalPanel({ workOrderId, purchaseEntries, currentStatus }: Props) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState("")
  const [approvalNotes, setApprovalNotes] = useState("")
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null)
  const [approveAction, setApproveAction] = useState<"APPROVE" | "REJECT">("APPROVE")

  const { data: approvalsData } = useQuery({
    queryKey: ["purchase-approvals", workOrderId],
    queryFn: () => api.get<any>(`/work-orders/${workOrderId}/purchase-approvals`),
  })

  const approvals: PurchaseApproval[] = approvalsData?.approvals || []

  const isOwner = user?.role === "OWNER"
  const isManager = user?.role === "MANAGER"
  const isInventoryManager = user?.role === "INVENTORY_MANAGER"
  const canApprove = isOwner || isManager

  const approvalMutation = useMutation({
    mutationFn: (data: any) => api.post(`/work-orders/${workOrderId}/purchase-approvals`, data),
    onSuccess: () => {
      toast.success("Purchase approval processed")
      queryClient.invalidateQueries({ queryKey: ["purchase-approvals", workOrderId] })
      setShowRequestModal(false)
      setShowApproveModal(false)
      setSelectedEntryId("")
      setApprovalNotes("")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const requestApproval = () => {
    if (!selectedEntryId) return
    const entry = purchaseEntries.find((pe) => pe.id === selectedEntryId)
    if (!entry) return
    approvalMutation.mutate({
      action: "REQUEST_APPROVAL",
      purchaseEntryId: selectedEntryId,
      amount: entry.totalCost,
    })
  }

  const handleApproveReject = () => {
    if (!selectedApprovalId) return
    approvalMutation.mutate({
      action: approveAction,
      approvalId: selectedApprovalId,
      notes: approvalNotes || undefined,
    })
  }

  const needsApproval = purchaseEntries.filter((pe) => {
    const alreadyRequested = approvals.some((a) => a.purchaseEntryId === pe.id)
    return !alreadyRequested
  })

  const pendingApprovals = approvals.filter((a) => a.status === "PENDING")
  const approvedApprovals = approvals.filter((a) => a.status === "APPROVED")
  const rejectedApprovals = approvals.filter((a) => a.status === "REJECTED")

  if (approvals.length === 0 && needsApproval.length === 0) return null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>
      case "REJECTED": return <Badge variant="danger"><XCircle className="h-3 w-3" /> Rejected</Badge>
      default: return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
    }
  }

  return (
    <>
      <Card className="border-t-4 border-t-[#FFB648]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#FFB648]" /> Purchase Approvals
            </span>
            <div className="flex gap-1">
              {pendingApprovals.length > 0 && <Badge variant="warning">{pendingApprovals.length} pending</Badge>}
              {isInventoryManager && needsApproval.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setShowRequestModal(true)}>
                  <ShieldAlert className="h-3 w-3 mr-1" /> Request Approval
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length > 0 && canApprove && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Pending Your Approval
              </p>
              {pendingApprovals.map((pa) => (
                <div key={pa.id} className="flex items-center justify-between p-2 rounded-lg bg-white mb-1">
                  <div>
                    <p className="text-sm font-medium">{pa.purchaseEntry?.supplierName || "Unknown supplier"}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(pa.amount)} • Requested by {pa.requestedBy.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="success" onClick={() => { setSelectedApprovalId(pa.id); setApproveAction("APPROVE"); setShowApproveModal(true) }}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setSelectedApprovalId(pa.id); setApproveAction("REJECT"); setShowApproveModal(true) }}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {approvals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No purchase approvals yet</p>
          ) : (
            <div className="space-y-2">
              {approvals.map((pa) => (
                <div key={pa.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{pa.purchaseEntry?.supplierName || "Unknown"}</p>
                      {getStatusBadge(pa.status)}
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatCurrency(pa.amount)} • Requested by {pa.requestedBy.name}
                      {pa.approvedBy && ` • ${pa.status === "APPROVED" ? "Approved" : "Rejected"} by ${pa.approvedBy.name}`}
                      {pa.approvedAt && ` • ${formatDateTime(pa.approvedAt)}`}
                    </p>
                    {pa.rejectedReason && (
                      <p className="text-xs text-[#F45D5D] mt-1">Reason: {pa.rejectedReason}</p>
                    )}
                  </div>
                  <Badge variant={pa.purchaseEntry?.purchaseType === "LPO" ? "primary" : "default"}>
                    {pa.purchaseEntry?.purchaseType || "CASH"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Approval Modal */}
      <Modal open={showRequestModal} onClose={() => setShowRequestModal(false)} title="Request Purchase Approval" size="sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Purchase Entry</label>
            <select
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={selectedEntryId}
              onChange={(e) => setSelectedEntryId(e.target.value)}
            >
              <option value="">Select a purchase...</option>
              {needsApproval.map((pe: any) => (
                <option key={pe.id} value={pe.id}>
                  {pe.supplierName || pe.supplier?.name || "Unknown"} - {formatCurrency(pe.totalCost)} ({pe.purchaseType})
                </option>
              ))}
            </select>
          </div>
          {selectedEntryId && (
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-500">
                {(() => {
                  const entry = purchaseEntries.find((pe) => pe.id === selectedEntryId)
                  if (!entry) return ""
                  return entry.totalCost > 15000
                    ? "This purchase requires OWNER approval (AED 15,000+)"
                    : entry.totalCost > 5000
                    ? "This purchase requires MANAGER approval (AED 5,000+)"
                    : "This purchase is under threshold and doesn't require approval"
                })()}
              </p>
            </div>
          )}
          <Button className="w-full" onClick={requestApproval} disabled={!selectedEntryId}>
            <ShieldAlert className="h-4 w-4 mr-1" /> Submit for Approval
          </Button>
        </div>
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal
        open={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title={approveAction === "APPROVE" ? "Approve Purchase" : "Reject Purchase"}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {approveAction === "APPROVE"
              ? "Are you sure you want to approve this purchase?"
              : "Are you sure you want to reject this purchase?"}
          </p>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">
              {approveAction === "APPROVE" ? "Approval Notes (optional)" : "Rejection Reason"}
            </label>
            <Input
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder={approveAction === "APPROVE" ? "Optional notes..." : "Why are you rejecting?"}
            />
          </div>
          <Button
            className="w-full"
            variant={approveAction === "APPROVE" ? "success" : "destructive"}
            onClick={handleApproveReject}
            disabled={approvalMutation.isPending || (approveAction === "REJECT" && !approvalNotes)}
          >
            {approveAction === "APPROVE" ? (
              <><CheckCircle className="h-4 w-4 mr-1" /> Approve Purchase</>
            ) : (
              <><XCircle className="h-4 w-4 mr-1" /> Reject Purchase</>
            )}
          </Button>
        </div>
      </Modal>
    </>
  )
}
