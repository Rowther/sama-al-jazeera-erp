"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"
import { toast } from "sonner"
import { useState, useCallback, useRef, useEffect } from "react"
import {
  ArrowLeft, FileText, Package, Users, CheckCircle2,
  Printer, UserCheck, Settings, ShieldCheck, Truck,
  AlertTriangle, DollarSign, ClipboardList, Circle
} from "lucide-react"

const CHECKLIST_ITEMS = [
  { key: "designCompleted", label: "Design Completed", icon: "🎨" },
  { key: "designApproved", label: "Design Approved", icon: "✅" },
  { key: "materialSelectionDone", label: "Material Selection Completed", icon: "📦" },
  { key: "measurementsVerified", label: "Measurements Verified", icon: "📐" },
  { key: "budgetApproved", label: "Budget Approved", icon: "💰" },
  { key: "advancePaymentReceived", label: "Advance Payment Received", icon: "💵" },
]

const APPROVAL_SECTIONS = [
  { key: "quality", label: "Quality", icon: ShieldCheck, color: "bg-green-50 border-green-200" },
  { key: "production", label: "Production", icon: Settings, color: "bg-blue-50 border-blue-200" },
  { key: "inventory", label: "Inventory", icon: Package, color: "bg-purple-50 border-purple-200" },
  { key: "accounts", label: "Accounts", icon: DollarSign, color: "bg-amber-50 border-amber-200" },
  { key: "coordinator", label: "Coordinator", icon: Users, color: "bg-cyan-50 border-cyan-200" },
  { key: "manager", label: "Manager", icon: UserCheck, color: "bg-indigo-50 border-indigo-200" },
]

export default function EnhancedJobCardPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["job-card-enhanced", params.id],
    queryFn: () => api.get<any>(`/work-orders/${params.id}/job-card`),
  })

  const [showApprovalModal, setShowApprovalModal] = useState<string | null>(null)

  const jobCardMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/work-orders/${params.id}/job-card`, data),
    onSuccess: () => {
      toast.success("Job card updated")
      queryClient.invalidateQueries({ queryKey: ["job-card-enhanced", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const canManage = user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "PRODUCTION_MANAGER"
  const canViewFinance = user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "ACCOUNTANT"

  const autoTickRan = useRef(false)
  useEffect(() => {
    const jc = data?.jobCard
    const wo = jc?.workOrder || data?.workOrder
    if (!wo || !jc || autoTickRan.current) return
    autoTickRan.current = true

    const updates: Record<string, boolean> = {}
    const s = wo.status

    if (["DESIGN_COMPLETED","DESIGN_APPROVED","READY_FOR_PRODUCTION","PRODUCTION_STARTED","IN_PRODUCTION","PRODUCTION_COMPLETED","DELIVERED","COMPLETED","CLOSED"].includes(s) && !jc.designCompleted) {
      updates.designCompleted = true
    }
    if (["DESIGN_APPROVED","READY_FOR_PRODUCTION","PRODUCTION_STARTED","IN_PRODUCTION","PRODUCTION_COMPLETED","DELIVERED","COMPLETED","CLOSED"].includes(s) && !jc.designApproved) {
      updates.designApproved = true
    }
    if (["READY_FOR_PRODUCTION","PRODUCTION_STARTED","IN_PRODUCTION","PRODUCTION_COMPLETED","DELIVERED","COMPLETED","CLOSED"].includes(s) && !jc.materialSelectionDone) {
      updates.materialSelectionDone = true
    }
    if (["READY_FOR_PRODUCTION","PRODUCTION_STARTED","IN_PRODUCTION","PRODUCTION_COMPLETED","DELIVERED","COMPLETED","CLOSED"].includes(s) && !jc.measurementsVerified) {
      updates.measurementsVerified = true
    }
    if (["READY_FOR_PRODUCTION","PRODUCTION_STARTED","IN_PRODUCTION","PRODUCTION_COMPLETED","DELIVERED","COMPLETED","CLOSED"].includes(s) && !jc.budgetApproved && wo.estimatedBudget && wo.estimatedBudget > 0) {
      updates.budgetApproved = true
    }
    if (!jc.advancePaymentReceived && wo.advanceReceived && wo.advanceReceived > 0) {
      updates.advancePaymentReceived = true
    }

    if (Object.keys(updates).length > 0) {
      jobCardMutation.mutate(updates)
    }
  }, [data, jobCardMutation])

  const handlePrintPdf = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/job-cards/${params.id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to load" }))
        toast.error(err.message || "Failed to print job card")
        return
      }
      const html = await res.text()
      const blob = new Blob([html], { type: "text/html" })
      window.open(URL.createObjectURL(blob), "_blank")
    } catch {
      toast.error("Failed to print job card")
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" />
      </div>
    )
  }

  const jobCard = data?.jobCard
  const wo = jobCard?.workOrder || data?.workOrder

  if (!jobCard && !wo) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Job Card</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium mb-1">No Job Card Yet</p>
            <p className="text-sm">Job cards are generated when a work order is created.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const workers = wo?.workerAssignments || []
  const stages = wo?.productionStages || []
  const jc = jobCard || {}

  const completedStages = stages.filter((s: any) => s.status === "COMPLETED")

  const handleChecklistToggle = (key: string) => {
    jobCardMutation.mutate({ [key]: !jc[key] })
  }

  const handleApproval = (section: string) => {
    jobCardMutation.mutate({
      [`${section}Approved`]: true,
      [`${section}ApprovedById`]: user?.id,
      [`${section}ApprovedAt`]: new Date().toISOString(),
    })
    setShowApprovalModal(null)
  }

  const completedChecklist = CHECKLIST_ITEMS.filter(i => jc[i.key]).length
  const approvedCount = APPROVAL_SECTIONS.filter(s => jc[`${s.key}Approved`]).length

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Job Card</h1>
              <Badge variant="primary">{wo?.workOrderId}</Badge>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {wo?.customer?.name} • {wo?.furnitureType || wo?.projectType || "N/A"}
              {jc?.generatedAt && ` • Generated ${formatDate(jc.generatedAt)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrintPdf}>
            <Printer className="h-4 w-4 mr-1" /> Print / PDF
          </Button>
          <Button size="sm" onClick={() => router.push(`/work-orders/${params.id}`)}>
            View Work Order
          </Button>
        </div>
      </div>

      {/* Top Status Bar */}
      <Card className="border-t-4 border-t-[#4F8EF7]">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-xl bg-[#EEF4FF]">
              <p className="text-xs text-gray-500">Status</p>
              <StatusBadge status={wo?.status} />
            </div>
            <div className="text-center p-3 rounded-xl bg-green-50">
              <p className="text-xs text-gray-500">Checklist</p>
              <p className="text-lg font-bold text-[#36B37E]">{completedChecklist}/{CHECKLIST_ITEMS.length}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-purple-50">
              <p className="text-xs text-gray-500">Production Manager Budget</p>
              <p className="text-lg font-bold text-[#8B5CF6]">
                {wo?.productionManagerBudget ? formatCurrency(wo.productionManagerBudget) : "-"}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50">
              <p className="text-xs text-gray-500">Progress</p>
              <p className="text-lg font-bold text-[#FFB648]">
                {stages.length > 0 ? Math.round((completedStages.length / stages.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 1: Basic Job Details */}
      <Card>
        <CardContent className="p-0">
          <div className="bg-[#4F8EF7] text-white px-4 sm:px-6 py-3 rounded-t-2xl flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <span className="font-semibold text-sm sm:text-base">SECTION 1: BASIC JOB DETAILS</span>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Work Order Ref</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{wo?.workOrderId}</p>
              </div>
              {canViewFinance && (
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Estimate / Budget</p>
                  <p className="text-sm font-semibold text-[#4F8EF7] mt-1">{wo?.estimatedBudget ? formatCurrency(wo.estimatedBudget) : "-"}</p>
                </div>
              )}
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Award Date</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{wo?.createdAt ? formatDate(wo.createdAt) : "-"}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Promise Date</p>
                <p className={`text-sm font-semibold mt-1 ${wo?.isDelayed ? "text-[#F45D5D]" : "text-gray-900"}`}>
                  {wo?.dueDate ? formatDate(wo.dueDate) : "-"}
                  {wo?.isDelayed && <span className="ml-2 text-xs">(Overdue)</span>}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Customer Name</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{wo?.customer?.name || "-"}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Customer Phone</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{wo?.customer?.phone || "-"}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 sm:col-span-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Address</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{wo?.customer?.location || "-"}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Project Type</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{wo?.projectType || "-"}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Assigned Manager</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{wo?.assignedTo?.name || wo?.createdBy?.name || "-"}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Assigned Carpenter</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {workers.find((w: any) => w.role === "CARPENTER")?.user?.name || jc?.carpenterName || "-"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Assigned Designer</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{wo?.assignedTo?.name || "-"}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Production Manager</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{wo?.createdBy?.name || "-"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Work Order Items */}
      <Card>
        <CardContent className="p-0">
          <div className="bg-[#8B5CF6] text-white px-4 sm:px-6 py-3 rounded-t-2xl flex items-center gap-2">
            <Package className="h-5 w-5" />
            <span className="font-semibold text-sm sm:text-base">SECTION 2: WORK ORDER ITEMS</span>
            <Badge variant="outline" className="ml-auto text-white border-white/30">
              {(wo?.workOrderItems || []).length} item{(wo?.workOrderItems || []).length === 1 ? "" : "s"}
            </Badge>
          </div>
          <div className="p-4 sm:p-6">
            {wo?.workOrderItems && wo.workOrderItems.length > 0 ? (
              <div className="space-y-3">
                {(wo.workOrderItems || []).map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                          <span className="text-xs text-gray-500">×{item.quantity}</span>
                          {item.isDelayed && (
                            <span className="text-xs text-[#F45D5D] flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> {item.delayDays}d delayed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={item.status} />
                          <span className="text-[10px] text-gray-400">
                            {item.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <div className="w-28">
                        <Progress value={item.progress} className="h-1.5" />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{item.progress}%</span>
                    </div>
                    {(item.description || item.dimensions || item.notes) && (
                      <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                        {item.description && (
                          <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-gray-400">
                          {item.dimensions && <span>Dimensions: {item.dimensions}</span>}
                          {item.notes && <span>{item.notes}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No items listed for this work order</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: Pre-Production Checklist */}
      <Card>
        <CardContent className="p-0">
          <div className="bg-[#36B37E] text-white px-4 sm:px-6 py-3 rounded-t-2xl flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <span className="font-semibold text-sm sm:text-base">SECTION 3: PRE-PRODUCTION CHECKLIST</span>
            <Badge variant="outline" className="ml-auto text-white border-white/30">{completedChecklist}/{CHECKLIST_ITEMS.length}</Badge>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CHECKLIST_ITEMS.map((item) => {
                const isDone = jc[item.key]
                return (
                  <button
                    key={item.key}
                    onClick={() => canManage && handleChecklistToggle(item.key)}
                    disabled={!canManage}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      isDone
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    } ${!canManage ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isDone ? "text-green-700" : "text-gray-600"}`}>
                        {item.label}
                      </p>
                      {jc[`${item.key}At`] && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatDateTime(jc[`${item.key}At`])}
                        </p>
                      )}
                    </div>
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4: Completion & Delivery Approvals */}
      <Card>
        <CardContent className="p-0">
          <div className="bg-[#F45D5D] text-white px-4 sm:px-6 py-3 rounded-t-2xl flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <span className="font-semibold text-sm sm:text-base">SECTION 4: COMPLETION & DELIVERY APPROVALS</span>
            <Badge variant="outline" className="ml-auto text-white border-white/30">{approvedCount}/{APPROVAL_SECTIONS.length}</Badge>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {APPROVAL_SECTIONS.map((section) => {
                const isApproved = jc[`${section.key}Approved`]
                const approvedBy = jc[`${section.key}ApprovedBy`]
                const approvedAt = jc[`${section.key}ApprovedAt`]
                const Icon = section.icon

                return (
                  <div
                    key={section.key}
                    className={`rounded-xl border p-4 text-center transition-all ${
                      isApproved
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    } ${canManage && !isApproved ? "cursor-pointer hover:border-[#4F8EF7] hover:shadow-sm" : ""}`}
                    onClick={() => canManage && !isApproved && setShowApprovalModal(section.key)}
                  >
                    <Icon className={`h-6 w-6 mx-auto mb-1 ${isApproved ? "text-green-600" : "text-gray-400"}`} />
                    <p className="text-[10px] text-gray-500 uppercase font-medium">{section.label}</p>
                    <p className={`text-lg font-bold mt-1 ${isApproved ? "text-green-600" : "text-gray-300"}`}>
                      {isApproved ? "✓" : "○"}
                    </p>
                    {isApproved && approvedBy && (
                      <p className="text-[9px] text-green-600 mt-1">{approvedBy.name}</p>
                    )}
                    {isApproved && approvedAt && (
                      <p className="text-[8px] text-gray-400">{formatDate(approvedAt)}</p>
                    )}
                    {!isApproved && (
                      <p className="text-[9px] text-gray-400 mt-1">Pending</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Digital Signature */}
            {wo?.digitalSignature && (
              <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Digitally Signed by {wo.digitalSignature.approvedBy?.name}
                  </p>
                  <p className="text-xs text-green-600">
                    {formatDateTime(wo.digitalSignature.approvedAt)} • {wo.digitalSignature.signatureType}
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Readiness */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Delivery Readiness</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">All approvals needed before delivery</span>
                  <Badge variant={approvedCount === APPROVAL_SECTIONS.length ? "success" : "default"}>
                    {approvedCount === APPROVAL_SECTIONS.length ? "Ready for Delivery" : `${APPROVAL_SECTIONS.length - approvedCount} pending`}
                  </Badge>
                </div>
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F45D5D] via-[#FFB648] to-[#36B37E] rounded-full transition-all duration-500"
                  style={{ width: `${(approvedCount / APPROVAL_SECTIONS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-[10px] text-gray-400 py-4 border-t border-gray-100">
        <p>FURNITURE ERP - Job Card System</p>
        <p className="mt-1">Generated on {jc?.generatedAt ? formatDateTime(jc.generatedAt) : "N/A"} • This is a computer-generated document</p>
      </div>

      {/* Approval Modal */}
      <Modal open={!!showApprovalModal} onClose={() => setShowApprovalModal(null)} title="Confirm Approval" size="sm">
        {showApprovalModal && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p className="text-sm font-medium text-gray-900">
                Approve: {APPROVAL_SECTIONS.find(s => s.key === showApprovalModal)?.label}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This action will record your approval with a timestamp.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowApprovalModal(null)}>
                Cancel
              </Button>
              <Button variant="success" className="flex-1" onClick={() => handleApproval(showApprovalModal)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Approval
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
