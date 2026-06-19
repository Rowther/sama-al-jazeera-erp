"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { PenTool, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"

export default function DesignsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["designs"],
    queryFn: () => api.get<any>("/designs"),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/designs/${id}`, { status: "APPROVED" }),
    onSuccess: () => {
      toast.success("Design approved")
      queryClient.invalidateQueries({ queryKey: ["designs"] })
      queryClient.invalidateQueries({ queryKey: ["work-orders"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const reviseMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/designs/${id}`, { status: "REVISION_REQUESTED" }),
    onSuccess: () => {
      toast.success("Revision requested")
      queryClient.invalidateQueries({ queryKey: ["designs"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const designs = data?.designs || []

  const pendingReview = designs.filter((d: any) => d.status === "PENDING_REVIEW")
  const approved = designs.filter((d: any) => d.status === "APPROVED")
  const revisionRequested = designs.filter((d: any) => d.status === "REVISION_REQUESTED")

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Designs</h1>
          <p className="text-sm text-gray-500 mt-1">{designs.length} total designs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <PenTool className="h-5 w-5 text-[#4F8EF7] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{designs.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Clock className="h-5 w-5 text-[#FFB648] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{pendingReview.length}</p>
          <p className="text-xs text-gray-500">Pending Review</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-[#36B37E] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{approved.length}</p>
          <p className="text-xs text-gray-500">Approved</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <AlertCircle className="h-5 w-5 text-[#F45D5D] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{revisionRequested.length}</p>
          <p className="text-xs text-gray-500">Revisions Needed</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-4">
        {designs.map((d: any) => (
          <Card key={d.id} className="hover:shadow-md transition-all cursor-pointer"
            onClick={() => router.push(`/work-orders/${d.workOrder?.id}`)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-[#EEF4FF]">
                    <PenTool className="h-5 w-5 text-[#4F8EF7]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{d.title}</h3>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {d.workOrder?.workOrderId} • {d.workOrder?.customer?.name}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Version {d.version}</span>
                      <span>Created by {d.createdBy?.name}</span>
                      <span>{formatDate(d.createdAt)}</span>
                      {Array.isArray(d.files) && <span>{d.files.length} file(s)</span>}
                    </div>
                  </div>
                </div>
                {(d.status === "PENDING_REVIEW" || d.status === "DESIGN_COMPLETED") && (user?.role === "MANAGER" || user?.role === "OWNER") && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="success" onClick={() => approveMutation.mutate(d.id)} disabled={approveMutation.isPending}>
                      Approve
                    </Button>
                    <Button size="sm" variant="warning" onClick={() => reviseMutation.mutate(d.id)} disabled={reviseMutation.isPending}>
                      Revise
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
