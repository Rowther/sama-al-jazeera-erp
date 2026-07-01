"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Package, ShoppingCart, AlertTriangle, CheckCircle,
  XCircle, Truck, Upload, FileText, Plus, Search, Eye, DollarSign
} from "lucide-react"

const MATERIAL_CATEGORIES = [
  "Wood", "Plywood", "MDF", "Hardware", "Handles",
  "Glass", "Metal", "Paint", "Accessories", "Custom Materials"
]

export default function MaterialAnalysisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workOrderId = searchParams.get("workOrderId")
  const queryClient = useQueryClient()

  const [showPurchaseForm, setShowPurchaseForm] = useState(false)
  const [purchaseForm, setPurchaseForm] = useState({
    supplierName: "", supplierContact: "", purchaseType: "CASH",
    invoiceNumber: "", billNumber: "", purchaseDate: new Date().toISOString().split("T")[0], notes: "",
  })
  const [purchaseItems, setPurchaseItems] = useState<any[]>([])
  const [currentItem, setCurrentItem] = useState({
    workOrderMaterialId: "", materialName: "", quantity: "", unitPrice: "",
  })
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  const { data: woData } = useQuery({
    queryKey: ["work-order", workOrderId],
    queryFn: () => api.get<any>(`/work-orders/${workOrderId}`),
    enabled: !!workOrderId,
  })

  const { data: materialsData } = useQuery({
    queryKey: ["work-order-materials", workOrderId],
    queryFn: () => api.get<any>(`/work-orders/${workOrderId}/materials`),
    enabled: !!workOrderId,
  })

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get<any>("/suppliers"),
  })

  const wo = woData?.workOrder
  const materials = materialsData?.materials || []
  const suppliers = suppliersData?.suppliers || []

  const availableMaterials = materials.filter((m: any) => {
    const s = m.computedStatus || m.status
    return s === "AVAILABLE" || s === "PARTIALLY_AVAILABLE"
  })
  const missingMaterials = materials.filter((m: any) => {
    const s = m.computedStatus || m.status
    return s === "OUT_OF_STOCK" || s === "PARTIALLY_AVAILABLE" || s === "PENDING"
  })
  const totalEstimatedMissing = missingMaterials.reduce((s: number, m: any) => s + (m.estimatedCost * (m.computedMissingQuantity ?? m.missingQuantity ?? m.requiredQuantity)), 0)

  const addItem = () => {
    if (!currentItem.materialName || !currentItem.quantity) return
    setPurchaseItems([...purchaseItems, { ...currentItem, id: Date.now().toString(), totalPrice: (parseFloat(currentItem.quantity) || 0) * (parseFloat(currentItem.unitPrice) || 0) }])
    setCurrentItem({ workOrderMaterialId: "", materialName: "", quantity: "", unitPrice: "" })
  }

  const removeItem = (id: string) => setPurchaseItems(purchaseItems.filter((i) => i.id !== id))

  const createPurchaseMutation = useMutation({
    mutationFn: (data: any) => api.post("/purchase-entries", data),
    onSuccess: () => {
      toast.success("Purchase entry created")
      setShowPurchaseForm(false)
      setPurchaseItems([])
      setPurchaseForm({ supplierName: "", supplierContact: "", purchaseType: "CASH", invoiceNumber: "", billNumber: "", purchaseDate: new Date().toISOString().split("T")[0], notes: "" })
      queryClient.invalidateQueries({ queryKey: ["purchase-entries"] })
      queryClient.invalidateQueries({ queryKey: ["work-order-materials", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const handleCreatePurchase = () => {
    if (purchaseItems.length === 0) { toast.error("Add at least one item"); return }
    createPurchaseMutation.mutate({
      workOrderId,
      ...purchaseForm,
      items: purchaseItems,
    })
  }

  const uploadDocMutation = useMutation({
    mutationFn: ({ entryId, file, fileType }: any) => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("fileType", fileType)
      return api.upload(`/purchase-entries/${entryId}/documents`, formData)
    },
    onSuccess: () => {
      toast.success("Document uploaded")
      setUploadingFor(null)
      queryClient.invalidateQueries({ queryKey: ["purchase-entries"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  if (!workOrderId) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/inventory-manager")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Material Analysis</h1>
        </div>
        <Card><CardContent className="p-12 text-center text-gray-400">Select a work order to analyze materials</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push("/dashboard/inventory-manager")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Work Order Material Analysis</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{wo?.workOrderId} • {wo?.customer?.name} • {wo?.furnitureType || "N/A"}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.push(`/work-orders/${workOrderId}`)}>
            <Eye className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">View Work Order</span>
          </Button>
          {missingMaterials.length > 0 && (
            <Button size="sm" onClick={() => setShowPurchaseForm(!showPurchaseForm)}>
              <ShoppingCart className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Create Purchase</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <Package className="h-5 w-5 text-[#4F8EF7] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{materials.length}</p>
          <p className="text-xs text-gray-500">Total Materials</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle className="h-5 w-5 text-[#36B37E] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{availableMaterials.length}</p>
          <p className="text-xs text-gray-500">Available</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 text-[#FFB648] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{missingMaterials.length}</p>
          <p className="text-xs text-gray-500">Missing / Short</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <DollarSign className="h-5 w-5 text-[#F45D5D] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalEstimatedMissing)}</p>
          <p className="text-xs text-gray-500">Est. Purchase Cost</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Available Materials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" /> Available Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableMaterials.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No available materials</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Material</th>
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Required</th>
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Available</th>
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Reserved</th>
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableMaterials.map((mat: any) => {
                      const av = mat.computedAvailableQuantity ?? mat.availableQuantity ?? 0
                      const st = mat.computedStatus || mat.status
                      return (
                        <tr key={mat.id} className="border-b border-gray-50">
                          <td className="py-2 px-2 font-medium text-gray-900">{mat.materialName}</td>
                          <td className="py-2 px-2">{mat.requiredQuantity} {mat.unit}</td>
                          <td className="py-2 px-2 text-[#36B37E]">{av}</td>
                          <td className="py-2 px-2">{mat.reservedQuantity || 0}</td>
                          <td className="py-2 px-2">
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{st?.replace(/_/g, " ")}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Missing Materials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" /> Missing Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missingMaterials.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">All materials are available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Material</th>
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Required</th>
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Missing</th>
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Est. Cost</th>
                      <th className="text-left py-2 px-2 text-gray-500 text-xs uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingMaterials.map((mat: any) => {
                      const st = mat.computedStatus || mat.status
                      const mq = mat.computedMissingQuantity ?? mat.missingQuantity ?? mat.requiredQuantity
                      return (
                        <tr key={mat.id} className={`border-b border-gray-50 ${st === "OUT_OF_STOCK" ? "bg-red-50" : "bg-yellow-50"}`}>
                          <td className="py-2 px-2 font-medium text-gray-900">{mat.materialName}</td>
                          <td className="py-2 px-2">{mat.requiredQuantity} {mat.unit}</td>
                          <td className="py-2 px-2 text-[#F45D5D] font-semibold">{mq}</td>
                          <td className="py-2 px-2">{formatCurrency((mat.estimatedCost || 0) * mq)}</td>
                          <td className="py-2 px-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              st === "OUT_OF_STOCK" ? "bg-red-100 text-red-700" :
                              st === "PARTIALLY_AVAILABLE" ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>{st?.replace(/_/g, " ")}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {missingMaterials.length > 0 && !showPurchaseForm && (
              <div className="mt-4">
                <Button className="w-full" onClick={() => setShowPurchaseForm(true)}>
                  <ShoppingCart className="h-4 w-4 mr-1" /> Create Purchase Entry for Missing Materials
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchase Entry Form */}
      {showPurchaseForm && (
        <Card className="border-t-4 border-t-[#FFB648]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#FFB648]" /> New Purchase Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Supplier Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Supplier Name *</label>
                <Input value={purchaseForm.supplierName} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierName: e.target.value })} placeholder="Supplier name" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Supplier Contact</label>
                <Input value={purchaseForm.supplierContact} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierContact: e.target.value })} placeholder="Phone / Email" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Purchase Type</label>
                <Select options={[{ value: "CASH", label: "Cash Purchase" }, { value: "LPO", label: "LPO Purchase" }]} value={purchaseForm.purchaseType} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseType: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Invoice Number</label>
                <Input value={purchaseForm.invoiceNumber} onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })} placeholder="Invoice #" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Bill Number</label>
                <Input value={purchaseForm.billNumber} onChange={(e) => setPurchaseForm({ ...purchaseForm, billNumber: e.target.value })} placeholder="Bill #" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Purchase Date</label>
                <Input type="date" value={purchaseForm.purchaseDate} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })} />
              </div>
            </div>

            {/* Purchase Items */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Purchase Items</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Material *</label>
                  <Select options={missingMaterials.map((m: any) => ({ value: m.id, label: m.materialName }))} value={currentItem.workOrderMaterialId} onChange={(e) => {
                    const mat = missingMaterials.find((m: any) => m.id === e.target.value)
                    setCurrentItem({ ...currentItem, workOrderMaterialId: e.target.value, materialName: mat?.materialName || "" })
                  }} placeholder="Select material" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Qty *</label>
                  <Input type="number" value={currentItem.quantity} onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Unit Price</label>
                  <Input type="number" value={currentItem.unitPrice} onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-1 flex items-end">
                  <p className="text-sm font-semibold text-gray-900 pb-2">
                    = {formatCurrency((parseFloat(currentItem.quantity) || 0) * (parseFloat(currentItem.unitPrice) || 0))}
                  </p>
                </div>
                <div className="space-y-1 flex items-end">
                  <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={!currentItem.materialName || !currentItem.quantity}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {purchaseItems.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 text-xs uppercase">Material</th>
                        <th className="text-left py-2 px-3 text-gray-500 text-xs uppercase">Qty</th>
                        <th className="text-left py-2 px-3 text-gray-500 text-xs uppercase">Unit Price</th>
                        <th className="text-left py-2 px-3 text-gray-500 text-xs uppercase">Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-900">{item.materialName}</td>
                          <td className="py-2 px-3">{item.quantity}</td>
                          <td className="py-2 px-3">{formatCurrency(parseFloat(item.unitPrice) || 0)}</td>
                          <td className="py-2 px-3 font-semibold">{formatCurrency(item.totalPrice)}</td>
                          <td className="py-2 px-3"><Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}><XCircle className="h-4 w-4 text-red-400" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 font-semibold">
                        <td className="py-2 px-3" colSpan={3}>Total</td>
                        <td className="py-2 px-3 text-[#4F8EF7]">{formatCurrency(purchaseItems.reduce((s, i) => s + i.totalPrice, 0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Notes</label>
              <textarea className="flex min-h-[60px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm" value={purchaseForm.notes} onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} placeholder="Purchase notes..." />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPurchaseForm(false)}>Cancel</Button>
              <Button onClick={handleCreatePurchase} disabled={createPurchaseMutation.isPending || purchaseItems.length === 0}>
                {createPurchaseMutation.isPending ? "Creating..." : "Submit Purchase Entry"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Purchase Entries for this Work Order */}
      <PurchaseEntriesList workOrderId={workOrderId} />
    </div>
  )
}

function PurchaseEntriesList({ workOrderId }: { workOrderId: string }) {
  const { data } = useQuery({
    queryKey: ["purchase-entries", workOrderId],
    queryFn: () => api.get<any>(`/purchase-entries?workOrderId=${workOrderId}`),
  })

  const entries = data?.purchaseEntries || []
  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Purchase History</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Supplier</th>
                <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Type</th>
                <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Items</th>
                <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Total</th>
                <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Status</th>
                <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Date</th>
                <th className="text-left py-3 px-3 text-gray-500 text-xs uppercase">Docs</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((pe: any) => (
                <tr key={pe.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-900">{pe.supplierName || pe.supplier?.name || "-"}</td>
                  <td className="py-3 px-3"><Badge variant={pe.purchaseType === "LPO" ? "primary" : "default"}>{pe.purchaseType}</Badge></td>
                  <td className="py-3 px-3">{pe.items?.length || 0}</td>
                  <td className="py-3 px-3 font-semibold text-gray-900">{formatCurrency(pe.totalCost)}</td>
                  <td className="py-3 px-3"><StatusBadge status={pe.paymentStatus} /></td>
                  <td className="py-3 px-3 text-gray-600">{formatDate(pe.purchaseDate)}</td>
                  <td className="py-3 px-3">
                    <div className="flex gap-1">
                      {pe.documents?.map((doc: any) => (
                        <Button key={doc.id} variant="ghost" size="sm" onClick={() => window.open(doc.fileUrl, "_blank")}><Eye className="h-3 w-3" /></Button>
                      ))}
                      <label className="cursor-pointer">
                        <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const formData = new FormData()
                            formData.append("file", file)
                            formData.append("fileType", file.type.startsWith("image/") ? "image" : "document")
                            api.upload(`/purchase-entries/${pe.id}/documents`, formData).then(() => {
                              toast.success("Document uploaded")
                            }).catch(() => toast.error("Upload failed"))
                          }
                        }} />
                        <Upload className="h-3 w-3 text-[#4F8EF7] cursor-pointer" />
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
