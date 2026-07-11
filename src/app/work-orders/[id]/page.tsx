"use client"

import { useState, useRef, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useDebounce } from "@/hooks"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft, DollarSign, Package, Users, Clock, FileText,
  TrendingUp, TrendingDown, AlertTriangle, Download, Edit, MessageSquare, Check, X, Plus,
  ShoppingCart, ClipboardList, Truck, Upload, Search, Eye, PackagePlus, BarChart3
} from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { WORK_ORDER_STATUSES, PRIORITIES, INVENTORY_CATEGORIES } from "@/lib/constants"
import { ProductionTracking } from "@/components/work-orders/production-tracking"
import { DigitalSignaturePanel } from "@/components/work-orders/digital-signature"

import { Modal } from "@/components/ui/modal"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ProductionStages } from "@/components/work-orders/production-stages"
import { LaborCostTracking } from "@/components/work-orders/labor-cost-tracking"
import { PurchaseApprovalPanel } from "@/components/work-orders/purchase-approval-panel"
import { ProgressPipeline } from "@/components/work-orders/progress-pipeline"
import { ItemProgress } from "@/components/work-orders/item-progress"
import { ItemDetail } from "@/components/work-orders/item-detail"
import { ProductionManagerBudgetSection } from "@/components/work-orders/production-manager-budget"

export default function WorkOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [newStatus, setNewStatus] = useState("")
  const [statusOpen, setStatusOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [newAssignee, setNewAssignee] = useState("")
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<any>("/users"),
    staleTime: 60000,
  })
  const allUsers = usersData?.users || []
  const designers = useMemo(() => allUsers.filter((u: any) => u.role === "DESIGNER"), [allUsers])

  const { data, isLoading } = useQuery({
    queryKey: ["work-order", params.id],
    queryFn: () => api.get<any>(`/work-orders/${params.id}`),
    staleTime: 15000,
  })

  const { data: materialsData } = useQuery({
    queryKey: ["work-order-materials", params.id],
    queryFn: () => api.get<any>(`/work-orders/${params.id}/materials`),
    staleTime: 15000,
  })

  const { data: purchaseEntriesData } = useQuery({
    queryKey: ["purchase-entries", params.id],
    queryFn: () => api.get<any>(`/purchase-entries?workOrderId=${params.id}`),
    staleTime: 15000,
  })

  const statusMutation = useMutation({
    mutationFn: (updates: any) => api.patch(`/work-orders/${params.id}`, updates),
    onSuccess: () => {
      toast.success("Work order updated")
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
      setStatusOpen(false)
      setAssignOpen(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemDimensions, setNewItemDimensions] = useState("")
  const [newItemNotes, setNewItemNotes] = useState("")
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemName, setEditItemName] = useState("")
  const [editItemQty, setEditItemQty] = useState(1)

  const addItemMutation = useMutation({
    mutationFn: (item: any) => api.post(`/work-orders/${params.id}/items`, item),
    onSuccess: () => {
      toast.success("Item added")
      setShowAddItem(false)
      setNewItemName("")
      setNewItemQty(1)
      setNewItemDimensions("")
      setNewItemNotes("")
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const updateItemMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/work-orders/${params.id}/items`, data),
    onSuccess: () => {
      toast.success("Item updated")
      setEditingItemId(null)
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/work-orders/${params.id}/items?itemId=${itemId}`),
    onSuccess: () => {
      toast.success("Item removed")
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const inventoryCheckMutation = useMutation({
    mutationFn: () => api.post(`/work-orders/${params.id}/run-inventory-check`, {}),
    onSuccess: (res: any) => {
      toast.success("Inventory check completed")
      queryClient.invalidateQueries({ queryKey: ["work-order-materials", params.id] })
      if (res.summary) {
        toast.message(`Summary: ${res.summary.available} available, ${res.summary.partial} partial, ${res.summary.outOfStock} out of stock`)
      }
    },
    onError: (err: any) => toast.error(err.message),
  })

  const sendMaterialRequestMutation = useMutation({
    mutationFn: () => api.post("/material-requests", {
      title: `Materials for ${wo?.workOrderId || params.id}`,
      workOrderId: params.id,
      items: materials.filter((m: any) => m.missingQuantity > 0).map((m: any) => ({
        name: m.materialName,
        quantity: m.missingQuantity || m.requiredQuantity,
        unit: m.unit || "pcs",
      })),
    }),
    onSuccess: (res: any) => {
      toast.success("Material request sent for approval")
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [newMaterial, setNewMaterial] = useState({
    materialName: "", category: "", requiredQuantity: "", unit: "pcs",
    estimatedCost: "", supplierPreference: "", priority: "MEDIUM", notes: "", inventoryItemId: "",
  })
  const [materialItemId, setMaterialItemId] = useState("")
  const [materialSelected, setMaterialSelected] = useState(false)
  const debouncedMaterialSearch = useDebounce(newMaterial.materialName, 300)
  const { data: materialSearchData, isFetching: materialSearching } = useQuery({
    queryKey: ["inventory-search", debouncedMaterialSearch],
    queryFn: () => api.get<any>(`/inventory?search=${encodeURIComponent(debouncedMaterialSearch)}&limit=10`),
    staleTime: 0,
    enabled: debouncedMaterialSearch.length > 0,
    placeholderData: keepPreviousData,
  })
  const searchResults = materialSearchData?.inventory || []

  const [editingMaterial, setEditingMaterial] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  const materialActionMutation = useMutation({
    mutationFn: (payload: any) => api.patch(`/work-orders/${params.id}/materials`, payload),
    onSuccess: () => {
      toast.success("Materials updated")
      setEditingMaterial(null)
      queryClient.invalidateQueries({ queryKey: ["work-order-materials", params.id] })
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const addMaterialMutation = useMutation({
    mutationFn: (materials: any[]) => api.post(`/work-orders/${params.id}/materials`, { materials }),
    onSuccess: () => {
      toast.success("Materials added")
      setShowAddMaterial(false)
      setMaterialItemId("")
      setNewMaterial({ materialName: "", category: "", requiredQuantity: "", unit: "pcs", estimatedCost: "", supplierPreference: "", priority: "MEDIUM", notes: "", inventoryItemId: "" })
      queryClient.invalidateQueries({ queryKey: ["work-order-materials", params.id] })
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
      inventoryCheckMutation.mutate()
    },
    onError: (err: any) => toast.error(err.message),
  })

  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<string | null>(null)
  const [expenseForm, setExpenseForm] = useState({ category: "", amount: "", description: "", date: "" })

  const addExpenseMutation = useMutation({
    mutationFn: (data: any) => api.post(`/work-orders/${params.id}/expenses`, data),
    onSuccess: () => {
      toast.success("Expense added")
      setShowExpenseForm(false)
      setExpenseForm({ category: "", amount: "", description: "", date: "" })
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const editExpenseMutation = useMutation({
    mutationFn: ({ expenseId, ...data }: any) => api.patch(`/work-orders/${params.id}/expenses/${expenseId}`, data),
    onSuccess: () => {
      toast.success("Expense updated")
      setShowExpenseForm(false)
      setEditingExpense(null)
      setExpenseForm({ category: "", amount: "", description: "", date: "" })
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => api.delete(`/work-orders/${params.id}/expenses/${expenseId}`),
    onSuccess: () => {
      toast.success("Expense deleted")
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const addPaymentMutation = useMutation({
    mutationFn: (data: { amount: number; notes?: string }) =>
      api.post("/installments", { workOrderId: params.id, ...data }),
    onSuccess: () => {
      toast.success("Payment recorded")
      setShowPaymentModal(false)
      setPaymentAmount("")
      setPaymentNotes("")
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const [designTitle, setDesignTitle] = useState("")
  const [designDesc, setDesignDesc] = useState("")
  const [designUploading, setDesignUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const designMutation = useMutation({
    mutationFn: (data: any) => api.post("/designs", data),
    onSuccess: () => {
      toast.success("Design uploaded")
      setDesignTitle("")
      setDesignDesc("")
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const approveDesignMutation = useMutation({
    mutationFn: async (designId: string) => {
      await api.patch(`/designs/${designId}`, { status: "APPROVED" })
      if (wo?.status === "DESIGN_SUBMITTED") {
        await api.patch(`/work-orders/${params.id}`, { status: "MATERIAL_REVIEW" })
      }
    },
    onSuccess: () => {
      toast.success("Design approved")
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const reviseDesignMutation = useMutation({
    mutationFn: async (designId: string) => {
      await api.patch(`/designs/${designId}`, { status: "REVISION_REQUESTED" })
      if (wo?.status === "DESIGN_SUBMITTED") {
        await api.patch(`/work-orders/${params.id}`, { status: "DESIGN_IN_PROGRESS" })
      }
    },
    onSuccess: () => {
      toast.success("Revision requested")
      queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" /></div>
  }

  const wo = data?.workOrder
  if (!wo) return <div className="p-12 text-center text-gray-400">Work order not found</div>

  const materials = materialsData?.materials || []
  const purchaseEntries = purchaseEntriesData?.purchaseEntries || []

  const totalExpenses = (wo.expenses || []).reduce((s: number, e: any) => s + e.amount, 0)
  const totalFromInstallments = (wo.installments || []).reduce((s: number, i: any) => s + i.amount, 0)
  const totalPayments = totalFromInstallments + (wo.advanceReceived || 0)
  const totalAmount = wo.finalPrice || wo.estimatedBudget || 0
  const profit = totalPayments - totalExpenses
  const budgetUsage = wo.estimatedBudget ? ((totalExpenses / wo.estimatedBudget) * 100).toFixed(0) : 0

  const estimatedMaterialCost = materials.reduce((s: number, m: any) => s + (m.estimatedCost * m.requiredQuantity), 0)
  const actualMaterialCost = materials.reduce((s: number, m: any) => s + m.actualCost, 0)
  const purchasedMaterialCost = purchaseEntries.reduce((s: number, pe: any) => s + pe.totalCost, 0)
  const inventoryUsedCost = actualMaterialCost - purchasedMaterialCost
  const extraCost = Math.max(0, actualMaterialCost - estimatedMaterialCost)
  const pendingSupplierPayments = purchaseEntries.filter((pe: any) => pe.paymentStatus === "PENDING").reduce((s: number, pe: any) => s + pe.totalCost, 0)

  const costData = [
    ...(wo.expenses || []).reduce((acc: any, e: any) => {
      const existing = acc.find((a: any) => a.name === e.category)
      if (existing) existing.value += e.amount
      else acc.push({ name: e.category, value: e.amount })
      return acc
    }, []),
  ]

  const labourUsers = (usersData?.users || []).filter((u: any) => u.role === "LABOUR" || u.role === "DRIVER").map((u: any) => ({
    ...u,
    name: u.employee?.designation ? `${u.name} (${u.employee.designation})` : u.name,
  }))
  const workOrderItems = (wo?.workOrderItems || []).map((i: any) => ({ id: i.id, name: i.name, quantity: i.quantity }))
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER"
  const isDesigner = user?.role === "DESIGNER"
  const isInventoryManager = user?.role === "INVENTORY_MANAGER"
  const isAccountant = user?.role === "ACCOUNTANT"
  const canReviewMaterials = canManage || isAccountant
  const designerStatuses = ["DESIGN_IN_PROGRESS", "DESIGN_COMPLETED"]
  const statusOptions = isDesigner
    ? WORK_ORDER_STATUSES.filter((s: any) => designerStatuses.includes(s.value))
    : WORK_ORDER_STATUSES

  const handleDesignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!designTitle.trim()) return
    setDesignUploading(true)

    const files: string[] = []
    const input = fileInputRef.current
    if (input?.files && input.files.length > 0) {
      for (const file of Array.from(input.files)) {
        const formData = new FormData()
        formData.append("file", file)
        try {
          const res = await api.upload<any>("/upload", formData)
          files.push(res.url)
        } catch {
          toast.error(`Failed to upload ${file.name}`)
        }
      }
    }

    designMutation.mutate(
      { workOrderId: params.id, title: designTitle, description: designDesc, files },
      { onSettled: () => { setDesignUploading(false); if (input) input.value = "" } }
    )
  }

  const canRunInventoryCheck = wo.status === "READY_FOR_PRODUCTION" && (isInventoryManager || canManage || user?.role === "OWNER")

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{wo.workOrderId}</h1>
              {statusOpen ? (
                <div className="flex items-center gap-1">
                  <Select
                    options={statusOptions.map((s: any) => ({ value: s.value, label: s.label }))}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  />
                  <Button size="sm" variant="ghost" onClick={() => { statusMutation.mutate({ status: newStatus }); setNewStatus("") }}>
                    <Check className="h-4 w-4 text-green-500" />
                  </Button>
                </div>
              ) : (
                <button onClick={() => { setNewStatus(wo.status); setStatusOpen(true) }} className="cursor-pointer" title="Click to change status">
                  <StatusBadge status={wo.status} />
                </button>
              )}
              <StatusBadge status={wo.priority} />
            </div>
            <p className="text-sm text-gray-500 mt-1 truncate">
              {wo.customer?.name} • {wo.furnitureType || "N/A"}
              {canManage && (assignOpen ? (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Select
                    options={designers.map((d: any) => ({ value: d.id, label: d.name }))}
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    placeholder="Select designer"
                  />
                  <Button size="sm" variant="ghost" onClick={() => { statusMutation.mutate({ assignedToId: newAssignee || null }); setNewAssignee("") }}>
                    <Check className="h-4 w-4 text-green-500" />
                  </Button>
                </span>
              ) : (
                <button onClick={() => { setNewAssignee(wo.assignedTo?.id || ""); setAssignOpen(true) }} className="ml-2 text-[#4F8EF7] hover:underline cursor-pointer">
                  {wo.assignedTo?.name ? `Designer: ${wo.assignedTo.name}` : "+ Assign designer"}
                </button>
              ))}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {canManage && (
            <Button variant="outline" size="sm" className="sm:text-sm" onClick={() => router.push(`/work-orders/${wo.id}/edit`)}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
          <Button variant="outline" size="sm" className="sm:text-sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </div>

      {/* Visual Progress Pipeline */}
      <ProgressPipeline workOrder={wo} />

      {/* Item-Level Progress */}
      {wo.workOrderItems && wo.workOrderItems.length > 0 && (
        <ItemProgress items={wo.workOrderItems} workOrderId={wo.id} labourUsers={labourUsers} currentStatus={wo.status} />
      )}

      {/* Job Card */}
      {wo.jobCard && (
        <Card className="border-t-4 border-t-[#4F8EF7]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-[#4F8EF7]" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Job Card Generated</p>
                  <p className="text-xs text-gray-500">
                    Generated by {wo.jobCard.generatedBy?.name} on {formatDateTime(wo.jobCard.generatedAt)}
                  </p>
                </div>
              </div>
              <Button onClick={() => router.push(`/job-cards/${wo.id}`)}>
                <Eye className="h-4 w-4 mr-1" /> View Job Card
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Overview */}
      {(user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "ACCOUNTANT" || user?.role === "PRODUCTION_MANAGER") && (
        <Card className="border-t-4 border-t-[#4F8EF7]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-[#4F8EF7]" /> Financial Overview</span>
              {(user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "ACCOUNTANT") && (
                <Button size="sm" variant="outline" onClick={() => setShowPaymentModal(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Record Payment
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-purple-50">
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="text-xl font-bold text-[#8B5CF6]">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="p-4 rounded-xl bg-green-50">
                <p className="text-xs text-gray-500">Customer Advance</p>
                <p className="text-xl font-bold text-[#36B37E]">{formatCurrency(wo.advanceReceived)}</p>
              </div>
              <div className="p-4 rounded-xl bg-red-50">
                <p className="text-xs text-gray-500">Total Spent</p>
                <p className="text-xl font-bold text-[#F45D5D]">{formatCurrency(totalExpenses)}</p>
              </div>
              <button onClick={() => setShowPaymentModal(true)} className="p-4 rounded-xl bg-[#EEF4FF] text-left w-full cursor-pointer hover:bg-[#E0EBFF] transition-colors">
                <p className="text-xs text-gray-500">Total Payments</p>
                <p className="text-xl font-bold text-[#4F8EF7]">{formatCurrency(totalPayments)}</p>
              </button>
              <div className={`p-4 rounded-xl ${profit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <p className="text-xs text-gray-500">Profit / Loss</p>
                <p className={`text-xl font-bold ${profit >= 0 ? "text-[#36B37E]" : "text-[#F45D5D]"}`}>
                  {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                </p>
              </div>
            </div>

            {/* Budget Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {(user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "ACCOUNTANT") && wo.estimatedBudget && (
                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Total Job Value</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Job Value</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(wo.estimatedBudget)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Spent So Far</span>
                      <span className="text-sm font-semibold text-[#F45D5D]">{formatCurrency(totalExpenses)}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Remaining</span>
                      <span className={`text-sm font-bold ${(wo.estimatedBudget - totalExpenses) >= 0 ? 'text-[#36B37E]' : 'text-[#F45D5D]'}`}>
                        {formatCurrency(Math.max(0, wo.estimatedBudget - totalExpenses))}
                      </span>
                    </div>
                  </div>
                  {wo.estimatedBudget > 0 && (
                    <div className="mt-3">
                      <Progress value={Math.min((totalExpenses / wo.estimatedBudget) * 100, 100)} variant={Number(budgetUsage) > 100 ? "danger" : Number(budgetUsage) > 80 ? "warning" : "default"} />
                      <p className="text-xs text-gray-400 mt-1">{budgetUsage}% used</p>
                    </div>
                  )}
                </div>
              )}
              {wo.productionManagerBudget != null && (
                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Production Manager Budget</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">PM Budget</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(wo.productionManagerBudget)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Spent So Far</span>
                      <span className="text-sm font-semibold text-[#F45D5D]">{formatCurrency(totalExpenses)}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Remaining</span>
                      <span className={`text-sm font-bold ${(wo.productionManagerBudget - totalExpenses) >= 0 ? 'text-[#36B37E]' : 'text-[#F45D5D]'}`}>
                        {formatCurrency(Math.max(0, wo.productionManagerBudget - totalExpenses))}
                      </span>
                    </div>
                  </div>
                  {wo.productionManagerBudget > 0 && (
                    <div className="mt-3">
                      <Progress value={Math.min((totalExpenses / wo.productionManagerBudget) * 100, 100)} variant={Number(budgetUsage) > 100 ? "danger" : Number(budgetUsage) > 80 ? "warning" : "default"} />
                      <p className="text-xs text-gray-400 mt-1">{wo.productionManagerBudget > 0 ? Math.min(Math.round((totalExpenses / wo.productionManagerBudget) * 100), 100) : 0}% used</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Production Manager Budget */}
            <ProductionManagerBudgetSection workOrder={wo} user={user} statusMutation={statusMutation} />

            {/* Material Cost Summary */}
            <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-[#4F8EF7]" /> Material Cost Summary
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Estimated Material Cost</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(estimatedMaterialCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Actual Material Cost</p>
                  <p className={`text-sm font-semibold ${actualMaterialCost > estimatedMaterialCost ? "text-[#F45D5D]" : "text-[#36B37E]"}`}>{formatCurrency(actualMaterialCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Purchased Material Cost</p>
                  <p className="text-sm font-semibold text-[#4F8EF7]">{formatCurrency(purchasedMaterialCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pending Supplier Payments</p>
                  <p className="text-sm font-semibold text-[#FFB648]">{formatCurrency(pendingSupplierPayments)}</p>
                </div>
              </div>
              {extraCost > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-[#F45D5D]">
                  <AlertTriangle className="h-3 w-3" />
                  Cost overrun: {formatCurrency(extraCost)} above estimate
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Expenses</p>
                  {(["OWNER", "MANAGER", "PRODUCTION_MANAGER", "INVENTORY_MANAGER"] as string[]).includes(user?.role || "") && (
                    !showExpenseForm ? (
                      <Button size="sm" variant="outline" onClick={() => setShowExpenseForm(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Expense
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => { setShowExpenseForm(false); setEditingExpense(null); setExpenseForm({ category: "", amount: "", description: "", date: "" }) }}>
                        Cancel
                      </Button>
                    )
                  )}
                </div>
                {(wo.expenses || []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-3">No expenses recorded</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                    {(wo.expenses || []).map((exp: any) => (
                      <div key={exp.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{exp.category}</p>
                          <p className="text-xs text-gray-400">{exp.description || formatDate(exp.date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#F45D5D]">{formatCurrency(exp.amount)}</p>
                          {(user?.role === "OWNER" || user?.role === "MANAGER") && (
                            <div className="flex gap-0.5">
                              <Button size="sm" variant="ghost" onClick={() => {
                                setEditingExpense(exp.id)
                                setExpenseForm({ category: exp.category, amount: String(exp.amount), description: exp.description || "", date: exp.date ? exp.date.split("T")[0] : "" })
                                setShowExpenseForm(true)
                              }}>
                                <Edit className="h-3 w-3 text-[#4F8EF7]" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ message: "Delete this expense?", onConfirm: () => deleteExpenseMutation.mutate(exp.id) })}>
                                <X className="h-3 w-3 text-red-400" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showExpenseForm && (
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    if (editingExpense) {
                      editExpenseMutation.mutate({ expenseId: editingExpense, ...expenseForm })
                    } else {
                      addExpenseMutation.mutate(expenseForm)
                    }
                  }} className="space-y-2 bg-white p-3 rounded-lg border border-gray-100">
                    <div className="grid grid-cols-2 gap-2">
                      <select className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} required>
                        <option value="">Category...</option>
                        <option value="MATERIAL">Material</option>
                        <option value="LABOUR">Labour</option>
                        <option value="TRANSPORT">Transport</option>
                        <option value="UTILITIES">Utilities</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="OTHER">Other</option>
                      </select>
                      <input type="number" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Amount" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
                    </div>
                    <input className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Description (optional)" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                    <Button type="submit" size="sm" className="w-full" disabled={addExpenseMutation.isPending || editExpenseMutation.isPending}>
                      {editExpenseMutation.isPending ? "Updating..." : addExpenseMutation.isPending ? "Adding..." : editingExpense ? "Update Expense" : "Save Expense"}
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {costData.length > 0 && (
              <div className="h-48 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Cost Breakdown</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#4F8EF7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>

          {/* Payment History Modal + Record Payment */}
          <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Payment History" size="md">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-green-50">
                  <p className="text-xs text-gray-500">Advance</p>
                  <p className="text-lg font-bold text-[#36B37E]">{formatCurrency(wo.advanceReceived)}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50">
                  <p className="text-xs text-gray-500">Total Paid</p>
                  <p className="text-lg font-bold text-[#4F8EF7]">{formatCurrency(totalPayments)}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50">
                  <p className="text-xs text-gray-500">Final Price</p>
                  <p className="text-lg font-bold text-[#8B5CF6]">{formatCurrency(totalAmount)}</p>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(wo.installments || []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No installment payments recorded</p>
                ) : (
                  (wo.installments || []).map((inst: any) => (
                    <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(inst.amount)}</p>
                        {inst.notes && <p className="text-xs text-gray-400">{inst.notes}</p>}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(inst.date || inst.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Record New Payment</p>
                <div className="space-y-3">
                  <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Amount" />
                  <Input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Notes (optional)" />
                  <Button className="w-full" onClick={() => addPaymentMutation.mutate({ amount: parseFloat(paymentAmount), notes: paymentNotes || undefined })} disabled={addPaymentMutation.isPending || !paymentAmount}>
                    <Plus className="h-4 w-4 mr-1" /> {addPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        </Card>
      )}

      <ProductionTracking
        workOrderId={wo.id}
        currentStatus={wo.status}
        productionStartedAt={wo.productionStartedAt}
        productionCompletedAt={wo.productionCompletedAt}
        workOrderItems={wo.workOrderItems?.map((i: any) => ({ id: i.id, name: i.name, quantity: i.quantity, status: i.status, progress: i.progress }))}
      />

      <ProductionStages
        workOrderId={wo.id}
        stages={wo.productionStages || []}
        currentStatus={wo.status}
        labourUsers={labourUsers}
        workOrderItems={workOrderItems}
      />

      {(user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "ACCOUNTANT" || user?.role === "PRODUCTION_MANAGER") && (
        <LaborCostTracking
          workOrderId={wo.id}
          workers={wo.workerAssignments || []}
          labourUsers={labourUsers}
          stages={wo.productionStages || []}
          currentStatus={wo.status}
          estimatedLaborCost={wo.estimatedLaborCost}
          workOrderItems={workOrderItems}
        />
      )}

      <DigitalSignaturePanel
        workOrderId={wo.id}
        currentStatus={wo.status}
        existingSignature={wo.digitalSignature}
      />

      {/* Purchase Approvals */}
      {(wo.purchaseApprovals?.length > 0 || (purchaseEntries.filter((pe: any) => {
        const alreadyRequested = (wo.purchaseApprovals || []).some((a: any) => a.purchaseEntryId === pe.id)
        return !alreadyRequested
      }).length > 0)) && (
        <PurchaseApprovalPanel
          workOrderId={wo.id}
          purchaseEntries={purchaseEntries}
          currentStatus={wo.status}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-400">Customer</p><p className="text-sm font-medium text-gray-900">{wo.customer?.name}</p></div>
                  <div><p className="text-xs text-gray-400">Phone</p><p className="text-sm font-medium text-gray-900">{wo.customer?.phone || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Company Name</p><p className="text-sm font-medium text-gray-900">{wo.companyName || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Company Contact</p><p className="text-sm font-medium text-gray-900">{wo.companyContact || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Estimate Ref</p><p className="text-sm font-medium text-gray-900">{wo.estimateRef || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Project Type</p><p className="text-sm font-medium text-gray-900">{wo.projectType || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Furniture Type</p><p className="text-sm font-medium text-gray-900">{wo.furnitureType || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Due Date</p><p className="text-sm font-medium text-gray-900">{wo.dueDate ? formatDate(wo.dueDate) : "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Payment Terms</p><p className="text-sm font-medium text-gray-900">{wo.paymentTerms || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Assigned To</p><p className="text-sm font-medium text-gray-900">{wo.assignedTo?.name || "Not assigned"}</p></div>
                  <div><p className="text-xs text-gray-400">Created By</p><p className="text-sm font-medium text-gray-900">{wo.createdBy?.name}</p></div>
                {(wo.workerAssignments || []).length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Assigned Workers</p>
                    <div className="flex flex-wrap gap-1">
                      {(wo.workerAssignments || []).map((w: any) => (
                        <span key={w.id} className="inline-flex items-center gap-1 text-xs bg-[#4F8EF7]/10 text-[#4F8EF7] px-2 py-1 rounded-full">
                          {w.user?.name}
                          <span className="text-gray-400">({w.role})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {wo.description && <div><p className="text-xs text-gray-400">Description</p><p className="text-sm text-gray-700 mt-1">{wo.description}</p></div>}
              {wo.dimensions && <div><p className="text-xs text-gray-400">Dimensions</p><p className="text-sm text-gray-700 mt-1">{wo.dimensions}</p></div>}
              {wo.items && wo.items.length > 0 && (
                <div><p className="text-xs text-gray-400">Items</p>
                  <div className="mt-1 space-y-1">
                    {wo.items.map((item: any, i: number) => (
                      <div key={i} className="text-sm text-gray-700 flex gap-2">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-400">x{item.quantity}</span>
                        {item.dimensions && <span className="text-gray-400">({item.dimensions})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400">Work Order Items</p>
                  {canManage && (
                    <Button size="sm" variant="ghost" onClick={() => setShowAddItem(!showAddItem)}>
                      <Plus className="h-3 w-3 mr-1" /> {showAddItem ? "Cancel" : "Add Item"}
                    </Button>
                  )}
                </div>
                {showAddItem && (
                  <div className="mb-3 p-3 rounded-xl bg-[#EEF4FF] border border-[#4F8EF7]/20 space-y-2">
                    <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Item name *" />
                    <div className="flex gap-2">
                      <Input type="number" min={1} value={newItemQty} onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)} placeholder="Qty" className="w-20" />
                      <Input value={newItemDimensions} onChange={(e) => setNewItemDimensions(e.target.value)} placeholder="Dimensions (optional)" className="flex-1" />
                    </div>
                    <Input value={newItemNotes} onChange={(e) => setNewItemNotes(e.target.value)} placeholder="Notes (optional)" />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setShowAddItem(false)}>Cancel</Button>
                      <Button size="sm" onClick={() => addItemMutation.mutate({ name: newItemName, quantity: newItemQty, dimensions: newItemDimensions || undefined, notes: newItemNotes || undefined })} disabled={addItemMutation.isPending || !newItemName.trim()}>
                        <Plus className="h-3 w-3 mr-1" /> {addItemMutation.isPending ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {(wo.workOrderItems || []).map((item: any) => (
                    <div key={item.id}>
                      {editingItemId === item.id ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                          <Input value={editItemName} onChange={(e) => setEditItemName(e.target.value)} className="flex-1" />
                          <Input type="number" min={1} value={editItemQty} onChange={(e) => setEditItemQty(parseInt(e.target.value) || 1)} className="w-16" />
                          <Button size="sm" variant="success" onClick={() => updateItemMutation.mutate({ itemId: item.id, name: editItemName, quantity: editItemQty })}><Check className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingItemId(null)}><X className="h-3 w-3" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors group">
                          <div className="flex-1 min-w-0" onClick={() => setSelectedItem(item)}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{item.name}</span>
                              <span className="text-xs text-gray-400">×{item.quantity}</span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                            )}
                          </div>
                          <div className="w-24">
                            <Progress value={item.progress} className="h-1.5" />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{item.progress}%</span>
                          <StatusBadge status={item.status} />
                          {item.isDelayed && (
                            <span className="text-xs text-red-500 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> {item.delayDays}d
                            </span>
                          )}
                          {canManage && (
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingItemId(item.id); setEditItemName(item.name); setEditItemQty(item.quantity) }}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setConfirmAction({ message: "Remove this item?", onConfirm: () => deleteItemMutation.mutate(item.id) })}>
                                <X className="h-3 w-3 text-red-400" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!wo.workOrderItems || wo.workOrderItems.length === 0) && !showAddItem && (
                    <p className="text-xs text-gray-400 text-center py-2">No items added yet</p>
                  )}
                </div>
              </div>
              {wo.notes && <div><p className="text-xs text-gray-400">Notes</p><p className="text-sm text-gray-700 mt-1">{wo.notes}</p></div>}
            </div>
          </CardContent>
        </Card>

        {!isDesigner && (
          <Card>
            <CardHeader><CardTitle>Documents & Attachments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Item Images */}
                {(wo.workOrderItems || []).filter((i: any) => i.image).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 font-medium mb-2">Item Images</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(wo.workOrderItems || []).filter((i: any) => i.image).map((item: any) => (
                        <div key={item.id} className="relative group">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-20 w-full object-cover rounded-lg border border-gray-200"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 rounded-b-lg">
                            <p className="text-[10px] text-white font-medium truncate">Item #{item.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6 p-0 bg-white/80 hover:bg-white"
                            onClick={() => window.open(item.image, "_blank")}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Documents */}
                {(wo.documents || []).length === 0 && (wo.workOrderItems || []).filter((i: any) => i.image).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">No documents uploaded</p>
                )}
                {(wo.documents || []).map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-[#4F8EF7]" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                        <p className="text-xs text-gray-400">{doc.type}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => window.open(doc.url, "_blank")}>View</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {(wo.activities || []).slice(0, 20).map((act: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="relative flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#4F8EF7] mt-1.5" />
                    {i < Math.min((wo.activities?.length || 0) - 1, 19) && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm text-gray-900">{act.description || act.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{act.user?.name}</span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-gray-400">{formatDateTime(act.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {(wo.activities || []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No activity recorded</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Required Materials & Inventory Check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Package className="h-5 w-5 text-[#4F8EF7]" /> Required Materials</span>
              <div className="flex items-center gap-2">
                {(isInventoryManager || user?.role === "OWNER" || user?.role === "MANAGER") && (
                  <Button size="sm" variant={materials.length === 0 ? "default" : "outline"} onClick={() => setShowAddMaterial(!showAddMaterial)}>
                    <PackagePlus className="h-4 w-4 mr-1" />
                    {showAddMaterial ? "Cancel" : materials.length === 0 ? "Add Materials" : "Add More"}
                  </Button>
                )}
                {canRunInventoryCheck && (
                  <Button size="sm" variant="outline" onClick={() => inventoryCheckMutation.mutate()} disabled={inventoryCheckMutation.isPending}>
                    <Search className="h-4 w-4 mr-1" />
                    {inventoryCheckMutation.isPending ? "Checking..." : "Run Inventory Check"}
                  </Button>
                )}
                {!canRunInventoryCheck && materials.length > 0 && wo.status !== "READY_FOR_PRODUCTION" && (
                  <Badge variant="default">{wo.status}</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showAddMaterial && (
              <div className="mb-4 p-4 rounded-xl bg-[#EEF4FF] border border-[#4F8EF7]/20 space-y-4">
                <p className="text-sm font-semibold text-gray-700">Add Required Materials</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1 relative">
                    <label className="text-xs text-gray-500">Material Name *</label>
                    <Input value={newMaterial.materialName} onChange={(e) => { setMaterialSelected(false); setNewMaterial({ ...newMaterial, materialName: e.target.value }) }} placeholder="e.g., MDF Board" />
                    {!materialSelected && debouncedMaterialSearch && (
                      <>
                        {materialSearching && searchResults.length === 0 && (
                          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm text-gray-400">
                            Searching...
                          </div>
                        )}
                        {!materialSearching && searchResults.length > 0 && (
                          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {searchResults.map((item: any) => (
                              <button
                                key={item.id}
                                type="button"
                                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 flex items-center justify-between"
                                onClick={() => {
                                  setMaterialSelected(true)
                                  setNewMaterial({
                                    ...newMaterial,
                                    materialName: item.name,
                                    category: item.category?.name || "",
                                    unit: item.unit || "pcs",
                                    estimatedCost: String(item.price || ""),
                                    requiredQuantity: "1",
                                    inventoryItemId: item.id,
                                  })
                                }}
                              >
                                <div>
                                  <span className="font-medium text-gray-900">{item.name}</span>
                                  {item.category?.name && (
                                    <span className="text-gray-400 ml-2 text-xs">({item.category.name})</span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                  Stock: {item.stockQuantity} {item.unit}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        {!materialSearching && searchResults.length === 0 && (
                          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm text-gray-400">
                            No matching items in inventory
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Category</label>
                    <Select options={[...INVENTORY_CATEGORIES].map((c) => ({ value: c, label: c }))} value={newMaterial.category} onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })} placeholder="Select" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Qty *</label>
                    <Input type="number" value={newMaterial.requiredQuantity} onChange={(e) => setNewMaterial({ ...newMaterial, requiredQuantity: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Unit</label>
                    <Select options={[{ value: "pcs", label: "Pieces" }, { value: "sqft", label: "Sq.Ft" }, { value: "m", label: "Meters" }, { value: "kg", label: "Kg" }, { value: "liters", label: "Liters" }, { value: "sheets", label: "Sheets" }, { value: "rolls", label: "Rolls" }, { value: "boxes", label: "Boxes" }]} value={newMaterial.unit} onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })} />
                  </div>
                </div>
                {(wo.workOrderItems && wo.workOrderItems.length > 0) && (
                  <div className="mb-3">
                    <Select
                      options={[
                        { value: "", label: "For Entire Work Order" },
                        ...wo.workOrderItems.map((i: any) => ({ value: i.id, label: `${i.name} (×${i.quantity})` })),
                      ]}
                      value={materialItemId}
                      onChange={(e) => setMaterialItemId(e.target.value)}
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Supplier Preference</label>
                    <Input value={newMaterial.supplierPreference} onChange={(e) => setNewMaterial({ ...newMaterial, supplierPreference: e.target.value })} placeholder="Supplier name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Priority</label>
                    <Select options={PRIORITIES.map((p: any) => ({ value: p.value, label: p.label }))} value={newMaterial.priority} onChange={(e) => setNewMaterial({ ...newMaterial, priority: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Notes</label>
                    <Input value={newMaterial.notes} onChange={(e) => setNewMaterial({ ...newMaterial, notes: e.target.value })} placeholder="Any notes..." />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => addMaterialMutation.mutate([{
                    materialName: newMaterial.materialName,
                    category: newMaterial.category,
                    requiredQuantity: newMaterial.requiredQuantity,
                    unit: newMaterial.unit,
                    supplierPreference: newMaterial.supplierPreference,
                    priority: newMaterial.priority,
                    notes: newMaterial.notes,
                    inventoryItemId: newMaterial.inventoryItemId || undefined,
                    workOrderItemId: materialItemId || undefined,
                  }])} disabled={addMaterialMutation.isPending || !newMaterial.materialName || !newMaterial.requiredQuantity}>
                    <PackagePlus className="h-4 w-4 mr-1" /> {addMaterialMutation.isPending ? "Adding..." : "Add to Work Order"}
                  </Button>
                </div>
              </div>
            )}
            {materials.length === 0 ? (
              !showAddMaterial && (
                <p className="text-sm text-gray-400 text-center py-8">No materials added yet</p>
              )
            ) : (
              <div>
                {canReviewMaterials && materials.filter((m: any) => m.status !== "APPROVED" && m.status !== "REJECTED").length > 0 && (
                  <div className="flex gap-2 mb-3">
                    <Button size="sm" variant="success" onClick={() => materialActionMutation.mutate({ action: "approve_all" })} disabled={materialActionMutation.isPending}>
                      <Check className="h-3 w-3 mr-1" /> Approve All
                    </Button>
                    <Button size="sm" variant="warning" onClick={() => materialActionMutation.mutate({ action: "reject_all" })} disabled={materialActionMutation.isPending}>
                      <X className="h-3 w-3 mr-1" /> Reject All
                    </Button>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Material</th>
                        <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Req</th>
                        {(isInventoryManager || canManage) && <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Available</th>}
                        <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Used</th>
                        <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Balance</th>
                        <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Status</th>
                        <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((mat: any) => (
                        <tr key={mat.id} className="border-b border-gray-50">
                          {editingMaterial === mat.id ? (
                            <td colSpan={isInventoryManager || canManage ? 7 : 6} className="py-2 px-2">
                              <div className="flex gap-2 items-start">
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Input size={8} value={editForm.materialName || mat.materialName} onChange={(e: any) => setEditForm({ ...editForm, materialName: e.target.value })} placeholder="Name" />
                                  <Input size={8} type="number" value={editForm.requiredQuantity ?? mat.requiredQuantity} onChange={(e: any) => setEditForm({ ...editForm, requiredQuantity: e.target.value })} placeholder="Qty" />
                                  <Input size={8} value={editForm.unit || mat.unit} onChange={(e: any) => setEditForm({ ...editForm, unit: e.target.value })} placeholder="Unit" />
                                  <Input size={8} type="number" value={editForm.estimatedCost ?? mat.estimatedCost} onChange={(e: any) => setEditForm({ ...editForm, estimatedCost: e.target.value })} placeholder="Est cost" />
                                </div>
                                <Button size="sm" variant="success" onClick={() => materialActionMutation.mutate({ materialId: mat.id, action: "edit", updates: editForm })}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingMaterial(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          ) : (
                            <>
                              <td className="py-2 px-2 font-medium text-gray-900">{mat.materialName}</td>
                              <td className="py-2 px-2">{mat.requiredQuantity} {mat.unit}</td>
                              {(isInventoryManager || canManage) && <td className="py-2 px-2 font-medium text-[#4F8EF7]">{mat.totalStockQuantity ?? "—"}</td>}
                              <td className="py-2 px-2">{mat.computedAvailableQuantity ?? mat.availableQuantity ?? 0}</td>
                              <td className="py-2 px-2 text-[#F45D5D]">{mat.computedMissingQuantity ?? mat.missingQuantity ?? 0}</td>
                              <td className="py-2 px-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  mat.status === "AVAILABLE" ? "bg-green-100 text-green-700" :
                                  mat.status === "PARTIALLY_AVAILABLE" ? "bg-yellow-100 text-yellow-700" :
                                  mat.status === "OUT_OF_STOCK" ? "bg-red-100 text-red-700" :
                                  mat.status === "ORDERED" ? "bg-blue-100 text-blue-700" :
                                  mat.status === "RECEIVED" || mat.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                                  mat.status === "REJECTED" ? "bg-red-100 text-red-700" :
                                  "bg-gray-100 text-gray-600"
                                }`}>{mat.status?.replace(/_/g, " ")}</span>
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex gap-1">
                                  {canReviewMaterials && mat.status !== "APPROVED" && mat.status !== "REJECTED" && (
                                    <>
                                      <Button size="sm" variant="ghost" onClick={() => materialActionMutation.mutate({ materialId: mat.id, status: "APPROVED" })} title="Approve">
                                        <Check className="h-3 w-3 text-green-500" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => materialActionMutation.mutate({ materialId: mat.id, status: "REJECTED" })} title="Reject">
                                        <X className="h-3 w-3 text-red-400" />
                                      </Button>
                                    </>
                                  )}
                                  {canReviewMaterials && (
                                    <Button size="sm" variant="ghost" onClick={() => { setEditingMaterial(mat.id); setEditForm({}) }} title="Edit">
                                      <Edit className="h-3 w-3 text-[#4F8EF7]" />
                                    </Button>
                                  )}
                                  {isInventoryManager && mat.missingQuantity > 0 && mat.status !== "ORDERED" && mat.status !== "RECEIVED" && (
                                    <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/inventory-manager/analysis?workOrderId=${params.id}`)}>
                                      <ShoppingCart className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {(isInventoryManager || user?.role === "OWNER" || user?.role === "MANAGER") && (
                                    <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ message: "Delete this material?", onConfirm: () => materialActionMutation.mutate({ materialId: mat.id, action: "delete" }) })} title="Delete">
                                      <X className="h-3 w-3 text-red-400" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Inventory Manager / Owner / Manager link */}
            {(isInventoryManager || user?.role === "OWNER" || user?.role === "MANAGER") && materials.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/dashboard/inventory-manager/analysis?workOrderId=${params.id}`)}>
                  <BarChart3 className="h-4 w-4 mr-1" /> Full Analysis
                </Button>
                <Button size="sm" className="flex-1" onClick={() => setShowAddMaterial(true)}>
                  <PackagePlus className="h-4 w-4 mr-1" /> Add More
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchase Entries */}
      {purchaseEntries.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-[#4F8EF7]" /> Purchase Entries</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Supplier</th>
                    <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Type</th>
                    <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Items</th>
                    <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Total Cost</th>
                    <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Payment</th>
                    <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Date</th>
                    <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Docs</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseEntries.map((pe: any) => (
                    <tr key={pe.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">{pe.supplierName || pe.supplier?.name || "-"}</td>
                      <td className="py-3 px-3"><Badge variant={pe.purchaseType === "LPO" ? "primary" : "default"}>{pe.purchaseType}</Badge></td>
                      <td className="py-3 px-3">{pe.items?.length || 0} items</td>
                      <td className="py-3 px-3 font-medium text-gray-900">{formatCurrency(pe.totalCost)}</td>
                      <td className="py-3 px-3"><StatusBadge status={pe.paymentStatus} /></td>
                      <td className="py-3 px-3 text-gray-600">{formatDate(pe.purchaseDate)}</td>
                      <td className="py-3 px-3">
                        {pe.documents?.length > 0 && (
                          <div className="flex gap-1">
                            {pe.documents.map((doc: any) => (
                              <Button key={doc.id} variant="ghost" size="sm" onClick={() => window.open(doc.fileUrl, "_blank")}>
                                <Eye className="h-3 w-3" />
                              </Button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}



      {/* Designs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#4F8EF7]" /> Designs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(wo.designs || []).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No designs uploaded yet</p>
          )}
          {(wo.designs || []).map((d: any) => (
            <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{d.title}</p>
                  <StatusBadge status={d.status} />
                </div>
                <p className="text-xs text-gray-400">
                  v{d.version} • {d.createdBy?.name} • {Array.isArray(d.files) ? d.files.length : 0} file(s)
                </p>
                {d.description && <p className="text-xs text-gray-500 mt-1">{d.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                {Array.isArray(d.files) && d.files.length > 0 && (
                  <div className="flex gap-1">
                    {d.files.map((f: string, i: number) => (
                      <Button key={i} variant="ghost" size="sm" onClick={() => window.open(f, "_blank")}>File {i + 1}</Button>
                    ))}
                  </div>
                )}
                {(d.status === "PENDING_REVIEW" || d.status === "DESIGN_COMPLETED" || d.status === "DESIGN_SUBMITTED") && canManage && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="success" onClick={() => approveDesignMutation.mutate(d.id)} disabled={approveDesignMutation.isPending}>Approve</Button>
                    <Button size="sm" variant="warning" onClick={() => reviseDesignMutation.mutate(d.id)} disabled={reviseDesignMutation.isPending}>Revise</Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {(isDesigner || canManage) && (
            <form onSubmit={handleDesignSubmit} className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">{isDesigner ? "Upload Design" : "Add Design (as admin)"}</p>
              <div className="space-y-3">
                <Input value={designTitle} onChange={(e) => setDesignTitle(e.target.value)} placeholder="Design title *" required />
                <Input value={designDesc} onChange={(e) => setDesignDesc(e.target.value)} placeholder="Description (optional)" />
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Design Files</label>
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.dwg,.svg,.ai,.eps" className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-[#EEF4FF] file:text-[#4F8EF7] hover:file:bg-[#D6E4FF] cursor-pointer" />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={designMutation.isPending || designUploading}>
                    {designUploading ? "Uploading files..." : designMutation.isPending ? "Saving..." : "Upload Design"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          workOrderId={wo.id}
          labourUsers={labourUsers}
          onClose={() => setSelectedItem(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) confirmAction.onConfirm(); setConfirmAction(null) }}
        title="Confirm"
        description={confirmAction?.message || ""}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
