"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, CheckCircle, XCircle, Eye, DollarSign, FileText, Truck,
  ClipboardList, Package, Check, X, AlertTriangle
} from "lucide-react"

type TabType = "materials" | "purchases"

export default function MaterialApprovalsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>("materials")

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push("/dashboard/accountant")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Material Approvals</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Review and approve materials and purchases</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 self-start sm:self-auto">
          <Button size="sm" variant={activeTab === "materials" ? "default" : "ghost"} onClick={() => setActiveTab("materials")}>
            <ClipboardList className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Material Reviews</span>
          </Button>
          <Button size="sm" variant={activeTab === "purchases" ? "default" : "ghost"} onClick={() => setActiveTab("purchases")}>
            <Truck className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Purchase Approvals</span>
          </Button>
        </div>
      </div>

      {activeTab === "materials" ? <MaterialReviewTab /> : <PurchaseApprovalsTab />}
    </div>
  )
}

function MaterialReviewTab() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: woData, isLoading } = useQuery({
    queryKey: ["work-orders", "material-review"],
    queryFn: () => api.get<any>("/work-orders?status=MATERIAL_REVIEW"),
  })

  const workOrders = woData?.workOrders || []

  const materialActionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.patch(`/work-orders/${id}/materials`, payload),
    onSuccess: () => {
      toast.success("Materials updated")
      queryClient.invalidateQueries({ queryKey: ["work-orders", "material-review"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" /></div>
  }

  if (workOrders.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          No work orders pending material review
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {workOrders.map((wo: any) => (
        <MaterialReviewCard
          key={wo.id}
          workOrder={wo}
          onApproveAll={() => materialActionMutation.mutate({ id: wo.id, payload: { action: "approve_all" } })}
          onRejectAll={() => materialActionMutation.mutate({ id: wo.id, payload: { action: "reject_all" } })}
          onApproveOne={(materialId) => materialActionMutation.mutate({ id: wo.id, payload: { materialId, status: "APPROVED" } })}
          onRejectOne={(materialId) => materialActionMutation.mutate({ id: wo.id, payload: { materialId, status: "REJECTED" } })}
          isPending={materialActionMutation.isPending}
        />
      ))}
    </div>
  )
}

function MaterialReviewCard({
  workOrder,
  onApproveAll,
  onRejectAll,
  onApproveOne,
  onRejectOne,
  isPending,
}: {
  workOrder: any
  onApproveAll: () => void
  onRejectAll: () => void
  onApproveOne: (id: string) => void
  onRejectOne: (id: string) => void
  isPending: boolean
}) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  const { data: matsData } = useQuery({
    queryKey: ["work-order-materials", workOrder.id],
    queryFn: () => api.get<any>(`/work-orders/${workOrder.id}/materials`),
  })

  const materials: any[] = matsData?.materials || []
  const pendingMaterials = materials.filter((m: any) => m.status !== "APPROVED" && m.status !== "REJECTED")
  const approvedMaterials = materials.filter((m: any) => m.status === "APPROVED")
  const rejectedMaterials = materials.filter((m: any) => m.status === "REJECTED")

  const editMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      api.patch(`/work-orders/${workOrder.id}/materials`, { materialId: id, action: "edit", updates }),
    onSuccess: () => {
      toast.success("Material updated")
      setEditingMaterialId(null)
      setEditForm({})
      queryClient.invalidateQueries({ queryKey: ["work-order-materials", workOrder.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const totalEstCost = materials.reduce((s: number, m: any) => s + (m.estimatedCost || 0) * (m.requiredQuantity || 0), 0)

  return (
    <Card className="border-l-4 border-l-cyan-400 hover:shadow-md transition-all">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600 shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">{workOrder.workOrderId}</h3>
              <p className="text-sm text-gray-500 truncate">{workOrder.customer?.name} • {workOrder.furnitureType || "N/A"}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <StatusBadge status={workOrder.status} />
                <span className="text-xs text-gray-400">{materials.length} materials</span>
                <span className="text-xs text-gray-400">{formatCurrency(totalEstCost)} est. total</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {pendingMaterials.length > 0 && (
              <>
                <Button size="sm" variant="success" onClick={onApproveAll} disabled={isPending}>
                  <Check className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Approve All</span>
                </Button>
                <Button size="sm" variant="warning" onClick={onRejectAll} disabled={isPending}>
                  <X className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Reject All</span>
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => router.push(`/work-orders/${workOrder.id}`)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {pendingMaterials.length > 0 && (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Material</th>
                  <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Qty</th>
                  <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Unit</th>
                  <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Est. Cost</th>
                  <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Total</th>
                  <th className="text-right py-2 px-2 text-gray-500 text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingMaterials.map((mat: any) => (
                  <tr key={mat.id} className="border-b border-gray-50">
                    {editingMaterialId === mat.id ? (
                      <>
                        <td className="py-2 px-2">
                          <input
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                            value={editForm.materialName ?? mat.materialName}
                            onChange={(e) => setEditForm({ ...editForm, materialName: e.target.value })}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            className="w-16 rounded border border-gray-200 px-2 py-1 text-xs"
                            type="number"
                            value={editForm.requiredQuantity ?? mat.requiredQuantity}
                            onChange={(e) => setEditForm({ ...editForm, requiredQuantity: e.target.value })}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            className="w-16 rounded border border-gray-200 px-2 py-1 text-xs"
                            value={editForm.unit ?? mat.unit}
                            onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-xs"
                            type="number"
                            value={editForm.estimatedCost ?? mat.estimatedCost}
                            onChange={(e) => setEditForm({ ...editForm, estimatedCost: e.target.value })}
                          />
                        </td>
                        <td className="py-2 px-2 font-semibold">
                          {formatCurrency((parseFloat(editForm.estimatedCost ?? mat.estimatedCost) || 0) * (parseFloat(editForm.requiredQuantity ?? mat.requiredQuantity) || 0))}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="success" className="h-7 text-xs" onClick={() => editMutation.mutate({ id: mat.id, updates: editForm })} disabled={editMutation.isPending}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingMaterialId(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-2 font-medium text-gray-900">{mat.materialName}</td>
                        <td className="py-2 px-2">{mat.requiredQuantity}</td>
                        <td className="py-2 px-2 text-gray-500">{mat.unit}</td>
                        <td className="py-2 px-2">{formatCurrency(mat.estimatedCost || 0)}</td>
                        <td className="py-2 px-2 font-semibold">{formatCurrency((mat.estimatedCost || 0) * (mat.requiredQuantity || 0))}</td>
                        <td className="py-2 px-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => onApproveOne(mat.id)} title="Approve" disabled={isPending}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => onRejectOne(mat.id)} title="Reject" disabled={isPending}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-500" onClick={() => { setEditingMaterialId(mat.id); setEditForm({ materialName: mat.materialName, requiredQuantity: mat.requiredQuantity, unit: mat.unit, estimatedCost: mat.estimatedCost }) }} title="Edit">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(approvedMaterials.length > 0 || rejectedMaterials.length > 0) && (
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
            {approvedMaterials.length > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" /> {approvedMaterials.length} approved
              </span>
            )}
            {rejectedMaterials.length > 0 && (
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" /> {rejectedMaterials.length} rejected
              </span>
            )}
            {pendingMaterials.length > 0 && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" /> {pendingMaterials.length} pending
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PurchaseApprovalsTab() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-entries", "pending-approvals"],
    queryFn: () => api.get<any>("/purchase-entries?accountantView=true"),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: string }) =>
      api.patch(`/purchase-entries/${id}`, { paymentStatus }),
    onSuccess: () => {
      toast.success("Payment status updated")
      queryClient.invalidateQueries({ queryKey: ["purchase-entries", "pending-approvals"] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const entries = data?.purchaseEntries || []
  const totalPending = entries.reduce((s: number, e: any) => s + e.totalCost, 0)

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" /></div>
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-gray-400">
          <Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          No pending material purchase approvals
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">{entries.length} entries awaiting approval</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(totalPending)} total</span>
        </CardContent>
      </Card>
      {entries.map((entry: any) => {
        const itemCount = entry.items?.length || 0
        const totalItems = entry.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0

        return (
          <Card key={entry.id} className="border-l-4 border-l-[#FFB648] hover:shadow-md transition-all">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Truck className="h-5 w-5 text-[#FFB648] shrink-0" />
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {entry.supplierName || entry.supplier?.name || "Unknown Supplier"}
                    </h3>
                    <Badge variant={entry.purchaseType === "LPO" ? "primary" : "default"}>{entry.purchaseType}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm text-gray-500">
                    <span>Work Order: <strong>{entry.workOrder?.workOrderId || "N/A"}</strong></span>
                    <span>{itemCount} items ({totalItems} total qty)</span>
                    <span>{formatDate(entry.purchaseDate)}</span>
                    {entry.invoiceNumber && <span className="truncate">Invoice: {entry.invoiceNumber}</span>}
                    {entry.billNumber && <span className="truncate">Bill: {entry.billNumber}</span>}
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(entry.totalCost)}</p>
                  <StatusBadge status={entry.paymentStatus} />
                </div>
              </div>

              {entry.items?.length > 0 && (
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-1 px-2 text-gray-400 text-xs">Material</th>
                        <th className="text-left py-1 px-2 text-gray-400 text-xs">Qty</th>
                        <th className="text-left py-1 px-2 text-gray-400 text-xs">Unit Price</th>
                        <th className="text-left py-1 px-2 text-gray-400 text-xs">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.items.map((item: any) => (
                        <tr key={item.id} className="border-b border-gray-50">
                          <td className="py-1 px-2 font-medium text-gray-900">{item.materialName}</td>
                          <td className="py-1 px-2">{item.quantity}</td>
                          <td className="py-1 px-2">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-1 px-2 font-semibold">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {entry.documents?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {entry.documents.map((doc: any) => (
                    <Button key={doc.id} variant="outline" size="sm" onClick={() => window.open(doc.fileUrl, "_blank")}>
                      <FileText className="h-3 w-3 mr-1" /> View {doc.fileType === "image" ? "Image" : "Document"}
                    </Button>
                  ))}
                </div>
              )}

              {entry.notes && (
                <p className="text-sm text-gray-500 mb-4 italic">{entry.notes}</p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <Button
                  variant="success" size="sm"
                  onClick={() => approveMutation.mutate({ id: entry.id, paymentStatus: "PAID" })}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve & Mark Paid
                </Button>
                <Button
                  variant="warning" size="sm"
                  onClick={() => approveMutation.mutate({ id: entry.id, paymentStatus: "PARTIALLY_PAID" })}
                  disabled={approveMutation.isPending}
                >
                  <DollarSign className="h-4 w-4 mr-1" /> Partial Payment
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push(`/work-orders/${entry.workOrderId}`)}>
                  <Eye className="h-4 w-4 mr-1" /> View Work Order
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
