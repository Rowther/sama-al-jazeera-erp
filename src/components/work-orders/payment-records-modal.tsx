"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Banknote, Landmark, FileCheck2, Wallet, CheckCircle2, Pencil, Trash2, Lock } from "lucide-react"
import { api } from "@/lib/api"
import { Modal } from "@/components/ui/modal"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editReference, setEditReference] = useState("")
  const [deleteRecord, setDeleteRecord] = useState<any>(null)

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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
    queryClient.invalidateQueries({ queryKey: ["accounting-work-orders"] })
    queryClient.invalidateQueries({ queryKey: ["analytics"] })
    queryClient.invalidateQueries({ queryKey: ["payments"] })
    queryClient.invalidateQueries({ queryKey: ["installments"] })
    queryClient.invalidateQueries({ queryKey: ["work-orders"] })
    queryClient.invalidateQueries({ queryKey: ["accountant-work-order-payments"] })
    queryClient.invalidateQueries({ queryKey: ["owner-work-order-payments"] })
  }

  const editMutation = useMutation({
    mutationFn: (data: { id: string; amount: number; notes?: string; reference?: string }) =>
      api.patch(`/payments/${data.id}`, { amount: data.amount, notes: data.notes, reference: data.reference }),
    onSuccess: () => {
      toast.success("Payment updated")
      setEditingId(null)
      invalidateAll()
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      toast.success("Payment deleted")
      setDeleteRecord(null)
      invalidateAll()
    },
    onError: (err: any) => toast.error(err.message),
  })

  const startEdit = (p: any) => {
    setEditingId(p.id)
    setEditAmount(String(p.amount))
    setEditNotes(p.notes ? p.notes.replace(/\s*\(Paid via .*\)?$/, "") : "")
    setEditReference(p.reference || "")
  }

  return (
    <>
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
                const isInitialAdvance = p.id === "initial-advance"

                if (editingId === p.id) {
                  return (
                    <div key={p.id} className="p-3 rounded-xl bg-white border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs font-semibold text-gray-400">Edit Payment {i + 1}</p>
                        <Badge className="bg-white text-[#4F8EF7] border border-blue-100">{paymentMethodLabel(method)}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            placeholder="Amount"
                          />
                          <Input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Note" />
                        </div>
                        {method !== "CASH" && (
                          <Input type="text" value={editReference} onChange={(e) => setEditReference(e.target.value)} placeholder="Reference number" />
                        )}
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                          <Button
                            size="sm"
                            disabled={editMutation.isPending || !editAmount}
                            onClick={() =>
                              editMutation.mutate({
                                id: p.id,
                                amount: parseFloat(editAmount),
                                notes: editNotes || undefined,
                                reference: method !== "CASH" && editReference ? editReference : undefined,
                              })
                            }
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                }

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
                          {isInitialAdvance && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-400">
                              <Lock className="h-3 w-3" /> Advance
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(p.amount)}</p>
                        {p.reference && <p className="text-xs text-gray-500">Ref: {p.reference}</p>}
                        {p.notes && <p className="text-xs text-gray-400 truncate">{p.notes}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-gray-400">{formatDate(p.date || p.createdAt)}</span>
                      {!isInitialAdvance && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(p)}
                            className="h-6 w-6 rounded-md hover:bg-blue-50 text-[#4F8EF7] flex items-center justify-center"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteRecord(p)}
                            className="h-6 w-6 rounded-md hover:bg-red-50 text-[#F45D5D] flex items-center justify-center"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteRecord}
        onClose={() => setDeleteRecord(null)}
        onConfirm={() => deleteMutation.mutate(deleteRecord.id)}
        title="Delete Payment"
        description={`Do you really want to delete this payment of ${deleteRecord ? formatCurrency(deleteRecord.amount) : ""}? This will also remove the matching installment and reduce the paid total.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </>
  )
}