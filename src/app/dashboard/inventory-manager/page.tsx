"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useDebounce } from "@/hooks"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { Package, AlertTriangle, ShoppingCart, TrendingUp, PlusCircle, BarChart3, PackagePlus, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PRIORITIES, INVENTORY_CATEGORIES } from "@/lib/constants"

export default function InventoryManagerDashboard() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: inventoryData } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.get<any>("/inventory"),
  })

  const { data: lowStockData } = useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: () => api.get<any>("/inventory?lowStock=true"),
  })

  const { data: workOrdersData } = useQuery({
    queryKey: ["work-orders", "production"],
    queryFn: () => api.get<any>("/work-orders"),
  })

  const { data: allWorkOrdersData } = useQuery({
    queryKey: ["work-orders", "needing-materials"],
    queryFn: () => api.get<any>("/work-orders?status=READY_FOR_PRODUCTION,PRODUCTION_STARTED,DESIGN_COMPLETED"),
  })

  const inventory = inventoryData?.inventory || []
  const lowStock = lowStockData?.inventory || []
  const workOrders = workOrdersData?.workOrders || []
  const allWorkOrders = allWorkOrdersData?.workOrders || []
  const productionReady = workOrders.filter((w: any) => w.status === "READY_FOR_PRODUCTION" || w.status === "PRODUCTION_STARTED")

  const totalItems = inventory.length
  const totalValue = inventory.reduce((s: number, i: any) => s + (i.price * i.stockQuantity), 0)
  const lowStockCount = inventory.filter((i: any) => i.stockQuantity <= i.minStock).length

  const [selectedWoId, setSelectedWoId] = useState("")
  const [materialSelected, setMaterialSelected] = useState(false)
  const [materialForm, setMaterialForm] = useState({
    materialName: "", category: "", requiredQuantity: "", unit: "pcs",
    estimatedCost: "", supplierPreference: "", priority: "MEDIUM", notes: "",
  })
  const debouncedMaterialSearch = useDebounce(materialForm.materialName, 300)
  const { data: materialSearchData, isFetching: materialSearching } = useQuery({
    queryKey: ["inventory-search", debouncedMaterialSearch],
    queryFn: () => api.get<any>(`/inventory?search=${encodeURIComponent(debouncedMaterialSearch)}&limit=10`),
    staleTime: 0,
    enabled: debouncedMaterialSearch.length > 0,
    placeholderData: keepPreviousData,
  })
  const searchResults = materialSearchData?.inventory || []

  const addMaterialMutation = useMutation({
    mutationFn: (data: { workOrderId: string; materials: any[] }) =>
      api.post(`/work-orders/${data.workOrderId}/materials`, { materials: data.materials }),
    onSuccess: () => {
      toast.success("Materials added to work order")
      setMaterialForm({ materialName: "", category: "", requiredQuantity: "", unit: "pcs", estimatedCost: "", supplierPreference: "", priority: "MEDIUM", notes: "" })
      setSelectedWoId("")
      queryClient.invalidateQueries({ queryKey: ["work-orders"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const handleAddMaterial = () => {
    if (!selectedWoId || !materialForm.materialName || !materialForm.requiredQuantity) {
      toast.error("Please select a work order and fill material name and quantity")
      return
    }
    addMaterialMutation.mutate({
      workOrderId: selectedWoId,
      materials: [{
        materialName: materialForm.materialName,
        category: materialForm.category,
        requiredQuantity: materialForm.requiredQuantity,
        unit: materialForm.unit,
        estimatedCost: materialForm.estimatedCost || "0",
        supplierPreference: materialForm.supplierPreference,
        priority: materialForm.priority,
        notes: materialForm.notes,
      }],
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" data-tour="inventory-title">Inventory Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Material tracking and stock management</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/inventory-manager/analysis")}>
            <BarChart3 className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Analysis</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/inventory-manager/usage")}>
            <Calendar className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Usage Report</span>
          </Button>
          <Button size="sm" onClick={() => router.push("/inventory")}>
            <Package className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Manage Inventory</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-tour="inventory-kpis">
        <Card><CardContent className="p-4 text-center">
          <Package className="h-5 w-5 text-[#4F8EF7] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          <p className="text-xs text-gray-500">Total Items</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <TrendingUp className="h-5 w-5 text-[#36B37E] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-gray-500">Stock Value</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 text-[#F45D5D] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
          <p className="text-xs text-gray-500">Low Stock Alerts</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <ShoppingCart className="h-5 w-5 text-[#FFB648] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{productionReady.length}</p>
          <p className="text-xs text-gray-500">Ready for Production</p>
        </CardContent></Card>
      </div>

      {/* Add Materials to Work Order */}
      <Card className="border-t-4 border-t-[#4F8EF7]" data-tour="inventory-add-materials">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-[#4F8EF7]" /> Add Materials to Work Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-gray-400">Select a work order and add the required materials. Materials will be linked to the work order for inventory tracking.</p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Work Order</label>
            <Select
              options={allWorkOrders.map((wo: any) => ({
                value: wo.id,
                label: `${wo.workOrderId} - ${wo.customer?.name || "N/A"} (${wo.status?.replace(/_/g, " ")})`,
              }))}
              value={selectedWoId}
              onChange={(e) => setSelectedWoId(e.target.value)}
              placeholder="Choose a work order..."
            />
          </div>
          {selectedWoId && (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Material Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1 relative">
                  <label className="text-xs text-gray-500">Material Name *</label>
                  <Input value={materialForm.materialName} onChange={(e) => { setMaterialSelected(false); setMaterialForm({ ...materialForm, materialName: e.target.value }) }} placeholder="e.g., MDF Board" />
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
                              setMaterialForm({
                                ...materialForm,
                                materialName: item.name,
                                category: item.category?.name || "",
                                unit: item.unit || "pcs",
                                estimatedCost: String(item.price || ""),
                                requiredQuantity: "1",
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
                  <Select options={[...INVENTORY_CATEGORIES].map((c) => ({ value: c, label: c }))} value={materialForm.category} onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })} placeholder="Select" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Qty *</label>
                  <Input type="number" value={materialForm.requiredQuantity} onChange={(e) => setMaterialForm({ ...materialForm, requiredQuantity: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Unit</label>
                  <Select options={[{ value: "pcs", label: "Pieces" }, { value: "sqft", label: "Sq.Ft" }, { value: "m", label: "Meters" }, { value: "kg", label: "Kg" }, { value: "liters", label: "Liters" }, { value: "sheets", label: "Sheets" }, { value: "rolls", label: "Rolls" }, { value: "boxes", label: "Boxes" }]} value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Est. Cost (per unit)</label>
                  <Input type="number" value={materialForm.estimatedCost} onChange={(e) => setMaterialForm({ ...materialForm, estimatedCost: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Supplier Preference</label>
                  <Input value={materialForm.supplierPreference} onChange={(e) => setMaterialForm({ ...materialForm, supplierPreference: e.target.value })} placeholder="Supplier name" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Priority</label>
                  <Select options={PRIORITIES.map((p: any) => ({ value: p.value, label: p.label }))} value={materialForm.priority} onChange={(e) => setMaterialForm({ ...materialForm, priority: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Notes</label>
                  <Input value={materialForm.notes} onChange={(e) => setMaterialForm({ ...materialForm, notes: e.target.value })} placeholder="Any notes..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedWoId("")}>Cancel</Button>
                <Button size="sm" onClick={handleAddMaterial} disabled={addMaterialMutation.isPending || !materialForm.materialName || !materialForm.requiredQuantity}>
                  <PlusCircle className="h-4 w-4 mr-1" /> {addMaterialMutation.isPending ? "Adding..." : "Add Material"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-tour="inventory-low-stock">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Low Stock Items</CardTitle>
            {lowStock.length > 0 && <Badge variant="danger">{lowStock.length} alerts</Badge>}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inventory.filter((i: any) => i.stockQuantity <= i.minStock).slice(0, 8).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100/50 cursor-pointer" onClick={() => router.push(`/inventory`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.category?.name} • {item.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#F45D5D]">{item.stockQuantity} {item.unit}</p>
                    <p className="text-xs text-gray-400">Min: {item.minStock}</p>
                  </div>
                </div>
              ))}
              {inventory.filter((i: any) => i.stockQuantity <= i.minStock).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">All items are well stocked</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-tour="inventory-ready">
          <CardHeader><CardTitle>Production Ready Work Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productionReady.map((wo: any) => (
                <div key={wo.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wo.workOrderId}</p>
                    <p className="text-xs text-gray-400">{wo.customer?.name}</p>
                  </div>
                  <StatusBadge status={wo.status} />
                </div>
              ))}
              {productionReady.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No work orders ready for production</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-tour="inventory-all">
        <CardHeader><CardTitle>All Inventory Items</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Name</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Category</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Stock</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Price</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Value</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.slice(0, 10).map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                    <td className="py-3 px-4 text-gray-700">{item.category?.name}</td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${item.stockQuantity <= item.minStock ? "text-[#F45D5D]" : "text-gray-700"}`}>
                        {item.stockQuantity} {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{formatCurrency(item.price)}</td>
                    <td className="py-3 px-4 text-gray-700">{formatCurrency(item.price * item.stockQuantity)}</td>
                    <td className="py-3 px-4">
                      {item.stockQuantity <= item.minStock ? (
                        <Badge variant="danger">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
