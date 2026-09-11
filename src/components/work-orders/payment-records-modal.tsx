"use client"

import { useQuery } from "@tanstack/react-query"
import { Banknote, Landmark, FileCheck2, Wallet, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"
import { Modal } from "@/components/ui/modal"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { paymentMethodLabel, methodFromPayment, paymentRecordsFromWorkOrder } from "@/lib/payments"
import { cn } from "@/lib/utils"

const METHOD_ICONS: Record<string, any> = {
  CASH: Banknote,
  BANK_TRANSFER: Landmark,
  CHEQUE: FileCheck2,
}

interface PaymentRecordsModalProps {
  open: boolean
  workOrderId?: string | null
  workOrderNumber?: string
  customerName?: string
  onClose: () => void
}

export function PaymentRecordsModal({ open, workOrderId, workOrderNumber, customerName, onClose }: PaymentRecordsModalProps) {
  const { data } = useQuery({
    queryKey: ["work-order", workOrderId],
    queryFn: () => api.get<any>(`/work-orders/${workOrderId}`),
    enabled: !!workOrderId && open,
  })

  const wo = data?.workOrder
  const records = wo ? paymentRecordsFromWorkOrder(wo) : []
  const totalPaid = records.reduce((s: number, p: any) => s + p.amount, 0) || wo?.advanceReceived || 0
  const jobValue = wo ? wo.finalPrice || wo.estimatedBudget || 0 : 0
  const remaining = Math.max(0, jobValue - totalPaid)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Payment Records${workOrderNumber ? ` · ${workOrderNumber}` : ""}`}
      description={customerName || undefined}
      size="md"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-green-50">
            <p className="text-xs text-gray-500">Total Received</p>
            <p className="text-lg font-bold text-[#36B37E]">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50">
            <p className="text-xs text-gray-500">Job Value</p>
            <p className="text-lg font-bold text-[#4F8EF7]">{formatCurrency(jobValue)}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50">
            <p className="text-xs text-gray-500">Remaining</p>
            <p className="text-lg font-bold text-[#FFB648]">{formatCurrency(remaining)}</p>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {records.length === 0 ? (
            <div className="text-center py-10">
              <Wallet className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No payments recorded yet for this work order.</p>
            </div>
          ) : (
            records.map((p: any, i: number) => {
              const method = methodFromPayment(p)
              const MethodIcon = METHOD_ICONS[method] || Banknote
              return (
                <div key={p.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                      method === "CASH" ? "bg-green-100 text-[#36B37E]"
                        : method === "BANK_TRANSFER" ? "bg-blue-100 text-[#4F8EF7]"
                          : "bg-amber-100 text-[#FFB648]"
                    )}>
                      <MethodIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-400">Payment {i + 1}</p>
                        <Badge className="bg-white text-[#4F8EF7] border border-blue-100">
                          {paymentMethodLabel(method)}
                        </Badge>
                        {p.status === "PAID" && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#36B37E]">
                            <CheckCircle2 className="h-3 w-3" /> PAID
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(p.amount)}</p>
                      {p.reference && <p className="text-xs text-gray-500">Ref: {p.reference}</p>}
                      {p.notes && <p className="text-xs text-gray-400 truncate">{p.notes}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{formatDate(p.date || p.createdAt)}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}