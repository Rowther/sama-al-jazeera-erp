"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Package, AlertTriangle, CheckCircle2 } from "lucide-react"
import type { WorkOrderItem, WorkOrderItemStatus } from "@/types"

const statusColors: Record<WorkOrderItemStatus, { border: string; bg: string; badge: "default" | "primary" | "success" | "warning" | "danger" }> = {
  PENDING: { border: "border-l-gray-300", bg: "bg-gray-50", badge: "default" },
  IN_PROGRESS: { border: "border-l-[#4F8EF7]", bg: "bg-blue-50/50", badge: "primary" },
  COMPLETED: { border: "border-l-[#36B37E]", bg: "bg-green-50/50", badge: "success" },
  DELAYED: { border: "border-l-[#F45D5D]", bg: "bg-red-50/50", badge: "danger" },
  CANCELLED: { border: "border-l-gray-400", bg: "bg-gray-50", badge: "default" },
}

const statusIcons: Record<WorkOrderItemStatus, React.ReactNode> = {
  PENDING: <Package className="h-4 w-4 text-gray-400" />,
  IN_PROGRESS: <Package className="h-4 w-4 text-[#4F8EF7]" />,
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-[#36B37E]" />,
  DELAYED: <AlertTriangle className="h-4 w-4 text-[#F45D5D]" />,
  CANCELLED: <Package className="h-4 w-4 text-gray-400" />,
}

interface ItemProgressProps {
  items: WorkOrderItem[]
}

export function ItemProgress({ items }: ItemProgressProps) {
  const overallProgress = useMemo(() => {
    if (items.length === 0) return 0
    const total = items.reduce((sum, item) => sum + item.progress, 0)
    return Math.round(total / items.length)
  }, [items])

  const activeItems = items.filter(i => i.status === "IN_PROGRESS").length
  const completedItems = items.filter(i => i.status === "COMPLETED").length
  const delayedItems = items.filter(i => i.isDelayed).length

  return (
    <Card className="border-t-4 border-t-[#4F8EF7]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#4F8EF7]" /> Item-Level Progress
          </span>
          <div className="flex gap-2 text-sm font-normal">
            {activeItems > 0 && <Badge variant="primary">{activeItems} active</Badge>}
            {completedItems > 0 && <Badge variant="success">{completedItems} done</Badge>}
            {delayedItems > 0 && <Badge variant="danger">{delayedItems} delayed</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No items in this work order</p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {items.map((item) => {
                const colors = statusColors[item.status]
                const progressVariant = item.status === "COMPLETED" ? "success" : item.status === "DELAYED" ? "danger" : "default"

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${colors.border} ${colors.bg}`}
                  >
                    <div className="flex-shrink-0">
                      {statusIcons[item.status]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                          <span className="text-xs text-gray-400 ml-2">×{item.quantity}</span>
                        </p>
                        {(item as any).description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{(item as any).description}</p>
                        )}
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <Badge variant={colors.badge}>{item.status.replace(/_/g, " ")}</Badge>
                          {item.isDelayed && (
                            <span className="text-xs text-[#F45D5D] flex items-center gap-1 whitespace-nowrap">
                              <AlertTriangle className="h-3 w-3" />
                              {item.delayDays}d
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={item.progress} variant={progressVariant} className="h-2" />
                        <span className={`text-xs w-8 text-right font-medium ${
                          item.progress === 100 ? "text-[#36B37E]" :
                          item.isDelayed ? "text-[#F45D5D]" :
                          "text-gray-500"
                        }`}>
                          {item.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-3 rounded-xl bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span className="font-medium">Overall Progress</span>
                <span className={`font-semibold ${
                  overallProgress === 100 ? "text-[#36B37E]" :
                  delayedItems > 0 ? "text-[#F45D5D]" :
                  "text-[#4F8EF7]"
                }`}>
                  {overallProgress}%
                </span>
              </div>
              <Progress
                value={overallProgress}
                variant={overallProgress === 100 ? "success" : delayedItems > 0 ? "danger" : "default"}
                className="h-2.5"
              />
              <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                <span>Total: {items.length} items</span>
                <span>Completed: {completedItems}</span>
                {delayedItems > 0 && <span className="text-[#F45D5D]">Delayed: {delayedItems}</span>}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
