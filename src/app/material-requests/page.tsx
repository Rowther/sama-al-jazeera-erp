"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { ClipboardList, Plus, Package } from "lucide-react"
import { useRouter } from "next/navigation"

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
}

export default function MaterialRequestsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<string>("")
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ["material-requests", filter],
    queryFn: () => api.get<any>(`/material-requests${filter ? `?status=${filter}` : ""}`),
  })

  const requests = data?.requests || []

  const pendingCount = requests.filter((r: any) => r.status === "PENDING").length
  const approvedCount = requests.filter((r: any) => r.status === "APPROVED").length
  const rejectedCount = requests.filter((r: any) => r.status === "REJECTED").length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Material Requests</h1>
          <p className="text-sm text-gray-500 mt-1">{requests.length} requests • {pendingCount} pending</p>
        </div>
        <Button onClick={() => router.push("/material-requests/new")}>
          <Plus className="h-4 w-4 mr-1" /> New Request
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className={`cursor-pointer transition-all ${!filter ? "ring-2 ring-blue-500" : ""}`} onClick={() => setFilter("")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
            <p className="text-sm text-gray-500">All</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all ${filter === "PENDING" ? "ring-2 ring-yellow-500" : ""}`} onClick={() => setFilter("PENDING")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all ${filter === "APPROVED" ? "ring-2 ring-green-500" : ""}`} onClick={() => setFilter("APPROVED")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            <p className="text-sm text-gray-500">Approved</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All Requests</CardTitle></CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No material requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((req: any) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-all"
                  onClick={() => router.push(`/material-requests/${req.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-white">
                      <Package className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{req.requestNumber}</span>
                        <Badge className={STATUS_STYLES[req.status] || ""}>{req.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{req.title}</p>
                      <p className="text-xs text-gray-400">
                        {req.requestedBy?.name} • {formatDate(req.createdAt)}
                        {req.workOrder && ` • ${req.workOrder.workOrderId}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500 shrink-0 ml-4">
                    <p>{(req.items || []).length} item(s)</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
