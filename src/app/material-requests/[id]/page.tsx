"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ArrowLeft, Package, CheckCircle, XCircle } from "lucide-react"

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
}

export default function MaterialRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [rejectReason, setRejectReason] = useState("")
  const [showReject, setShowReject] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["material-request", params.id],
    queryFn: () => api.get<any>(`/material-requests/${params.id}`),
  })

  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<any>("/auth/me"),
  })

  const req = data?.materialRequest
  const currentUser = userData?.user
  const canApprove = currentUser && ["ACCOUNTANT", "MANAGER", "OWNER"].includes(currentUser.role)
  const isPending = req?.status === "PENDING"

  const approveMutation = useMutation({
    mutationFn: () => api.patch(`/material-requests/${params.id}`, { action: "APPROVE" }),
    onSuccess: () => {
      toast.success("Request approved")
      queryClient.invalidateQueries({ queryKey: ["material-request", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.patch(`/material-requests/${params.id}`, { action: "REJECT", rejectedReason: rejectReason }),
    onSuccess: () => {
      toast.success("Request rejected")
      setShowReject(false)
      queryClient.invalidateQueries({ queryKey: ["material-request", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading...</div>
  if (!req) return <div className="p-8 text-center text-gray-400">Not found</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/material-requests")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{req.requestNumber}</h1>
            <Badge className={STATUS_STYLES[req.status] || ""}>{req.status}</Badge>
          </div>
          <p className="text-sm text-gray-500">{req.title}</p>
        </div>
        {canApprove && isPending && (
          <div className="flex gap-2">
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowReject(!showReject)}>
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-1" /> {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </div>
        )}
      </div>

      {showReject && (
        <Card className="border-red-200">
          <CardContent className="p-4 space-y-3">
            <label className="text-sm font-medium text-gray-700">Reason for rejection</label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why..." rows={2} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowReject(false); setRejectReason("") }}>Cancel</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending || !rejectReason.trim()}>
                {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Request Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-gray-500">Requested by</span><p className="font-medium">{req.requestedBy?.name}</p></div>
            <div><span className="text-gray-500">Date</span><p className="font-medium">{formatDate(req.createdAt)}</p></div>
            {req.workOrder && (
              <div>
                <span className="text-gray-500">Work Order</span>
                <p className="font-medium">
                  <button onClick={() => router.push(`/work-orders/${req.workOrder.id}`)} className="text-blue-600 hover:underline">
                    {req.workOrder.workOrderId} - {req.workOrder.customer?.name}
                  </button>
                </p>
              </div>
            )}
            {req.description && (
              <div><span className="text-gray-500">Description</span><p className="font-medium">{req.description}</p></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Approval Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {req.status === "PENDING" && <p className="text-yellow-600">Awaiting approval from Accountant or Manager</p>}
            {req.status === "APPROVED" && (
              <>
                <p className="text-green-600">Approved</p>
                <p className="font-medium">by {req.approvedBy?.name}</p>
              </>
            )}
            {req.status === "REJECTED" && (
              <>
                <p className="text-red-600">Rejected</p>
                <p className="font-medium">by {req.approvedBy?.name}</p>
                {req.rejectedReason && <div><span className="text-gray-500">Reason</span><p>{req.rejectedReason}</p></div>}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Requested Materials ({req.items?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          {(!req.items || req.items.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-4">No items</p>
          ) : (
            <div className="space-y-2">
              {(req.items as any[]).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{item.quantity} {item.unit || "pcs"}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
