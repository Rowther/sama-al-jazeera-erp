"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Package, AlertTriangle, CheckCircle2, Users, Layers,
  ClipboardList, DollarSign, CreditCard, X, User,
  Clock, HardHat,
} from "lucide-react"
import type { WorkOrderItem } from "@/types"

interface ItemDetailProps {
  item: WorkOrderItem
  workOrderId: string
  labourUsers: any[]
  onClose: () => void
}

const statusBadgeVariant: Record<string, "default" | "primary" | "success" | "warning" | "danger"> = {
  PENDING: "default",
  IN_PROGRESS: "primary",
  COMPLETED: "success",
  DELAYED: "danger",
  CANCELLED: "default",
}

export function ItemDetail({ item, workOrderId, labourUsers, onClose }: ItemDetailProps) {
  return (
    <Modal open={!!item} onClose={onClose} title={item.name} size="xl">
      <div className="space-y-6">
        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-500">Status</p>
            <Badge variant={statusBadgeVariant[item.status]} className="mt-1">
              {item.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-500">Quantity</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">×{item.quantity}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-500">Progress</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={item.progress} className="h-2 flex-1" variant={item.progress === 100 ? "success" : item.isDelayed ? "danger" : "default"} />
              <span className="text-xs font-medium">{item.progress}%</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-500">Delay</p>
            <p className={`text-sm font-semibold mt-1 ${item.isDelayed ? "text-[#F45D5D]" : "text-[#36B37E]"}`}>
              {item.isDelayed ? `${item.delayDays}d delayed` : "On track"}
            </p>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Estimated Cost
            </p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {item.estimatedCost != null ? formatCurrency(item.estimatedCost) : "-"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Actual Cost
            </p>
            <p className="text-sm font-semibold text-[#F45D5D] mt-1">
              {formatCurrency(item.actualCost)}
            </p>
          </div>
        </div>

        {/* Timeline */}
        {(item.productionStartedAt || item.productionCompletedAt) && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-400" /> Timeline
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {item.productionStartedAt && (
                <div className="p-2 rounded-lg bg-gray-50">
                  <p className="text-[10px] text-gray-400">Started</p>
                  <p className="text-xs font-medium">{formatDate(item.productionStartedAt)}</p>
                </div>
              )}
              {item.productionCompletedAt && (
                <div className="p-2 rounded-lg bg-gray-50">
                  <p className="text-[10px] text-gray-400">Completed</p>
                  <p className="text-xs font-medium">{formatDate(item.productionCompletedAt)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {(item as any).description && (
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700">{(item as any).description}</p>
          </div>
        )}

        {/* Dimensions & Notes */}
        {(item.dimensions || item.notes) && (
          <div className="grid grid-cols-2 gap-3">
            {item.dimensions && (
              <div className="p-2 rounded-lg bg-gray-50">
                <p className="text-[10px] text-gray-400">Dimensions</p>
                <p className="text-xs font-medium">{item.dimensions}</p>
              </div>
            )}
            {item.notes && (
              <div className="p-2 rounded-lg bg-gray-50">
                <p className="text-[10px] text-gray-400">Notes</p>
                <p className="text-xs font-medium">{item.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Assigned Workers */}
        {item.workerAssignments && item.workerAssignments.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
              <Users className="h-4 w-4 text-[#4F8EF7]" /> Assigned Workers ({item.workerAssignments.length})
            </h4>
            <div className="space-y-2">
              {item.workerAssignments.map((w) => (
                <div key={w.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                  <div className="h-7 w-7 rounded-full bg-[#4F8EF7]/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-3.5 w-3.5 text-[#4F8EF7]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">{w.user.name}</p>
                    <p className="text-[10px] text-gray-400">{w.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={w.progress} className="h-1.5 w-16" />
                    <span className="text-[10px] text-gray-500">{w.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Production Stages */}
        {item.productionStages && item.productionStages.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
              <Layers className="h-4 w-4 text-[#8B5CF6]" /> Production Stages ({item.productionStages.length})
            </h4>
            <div className="space-y-1">
              {item.productionStages.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      s.status === "COMPLETED" ? "bg-[#36B37E]" :
                      s.status === "IN_PROGRESS" ? "bg-[#4F8EF7]" :
                      s.isDelayed ? "bg-[#F45D5D]" :
                      "bg-gray-300"
                    }`} />
                    <span className="text-xs font-medium text-gray-900">{s.stageName}</span>
                    {s.isDelayed && (
                      <span className="text-[10px] text-[#F45D5D]">({s.delayMinutes}m delayed)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    {s.assignedTo?.name && <span>{s.assignedTo.name}</span>}
                    {s.completionPercentage > 0 && (
                      <span className="font-medium">{s.completionPercentage}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Materials */}
        {item.materials && item.materials.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
              <ClipboardList className="h-4 w-4 text-[#FFB648]" /> Materials ({item.materials.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 pr-2 font-medium">Material</th>
                    <th className="text-left py-1.5 px-2 font-medium">Qty</th>
                    <th className="text-left py-1.5 px-2 font-medium">Est. Cost</th>
                    <th className="text-left py-1.5 px-2 font-medium">Actual</th>
                    <th className="text-left py-1.5 pl-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {item.materials.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50">
                      <td className="py-1.5 pr-2 font-medium text-gray-900">{m.materialName}</td>
                      <td className="py-1.5 px-2 text-gray-500">{m.requiredQuantity} {m.unit}</td>
                      <td className="py-1.5 px-2 text-gray-500">{formatCurrency(m.estimatedCost)}</td>
                      <td className="py-1.5 px-2 text-gray-500">{formatCurrency(m.actualCost)}</td>
                      <td className="py-1.5 pl-2">
                        <Badge variant={m.status === "AVAILABLE" || m.status === "RECEIVED" ? "success" : m.status === "OUT_OF_STOCK" ? "danger" : "default"}>
                          {m.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Labor Entries */}
        {item.laborEntries && item.laborEntries.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
              <HardHat className="h-4 w-4 text-[#F45D5D]" /> Labor Entries ({item.laborEntries.length})
            </h4>
            <div className="space-y-2">
              {item.laborEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-[#F45D5D]/10 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-[#F45D5D]">
                        {entry.worker.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{entry.worker.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {entry.hoursWorked}h × {formatCurrency(entry.hourlyRate)}/hr
                        {entry.overtimeHours > 0 && ` + ${entry.overtimeHours}h OT`}
                        {entry.productionStage && ` • ${entry.productionStage.stageName}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-[#F45D5D]">{formatCurrency(entry.totalCost)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses */}
        {item.expenses && item.expenses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-[#FFB648]" /> Expenses ({item.expenses.length})
            </h4>
            <div className="space-y-1">
              {item.expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">{exp.category}</span>
                    {exp.description && (
                      <span className="text-[10px] text-gray-400">- {exp.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#FFB648]">{formatCurrency(exp.amount)}</span>
                    <span className="text-[10px] text-gray-400">{formatDate(exp.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
