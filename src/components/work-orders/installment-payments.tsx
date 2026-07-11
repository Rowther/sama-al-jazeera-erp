"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAuthStore } from "@/stores/authStore"
import { DollarSign, Plus, Wallet } from "lucide-react"

interface InstallmentPaymentsProps {
  workOrderId: string
  installments: any[]
  advanceReceived: number
  finalPrice?: number | null
  remainingAmount?: number | null
  currentStatus: string
}

export function InstallmentPayments({ workOrderId, installments, advanceReceived, finalPrice, remainingAmount, currentStatus }: InstallmentPaymentsProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")

  const canManage = user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "ACCOUNTANT"

  const addInstallmentMutation = useMutation({
    mutationFn: (data: { amount: number; notes?: string }) =>
      api.post("/installments", { workOrderId, ...data }),
    onSuccess: () => {
      toast.success("Installment recorded")
      setShowAddModal(false)
      setAmount("")
      setNotes("")
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const totalPaid = advanceReceived || 0
  const totalPrice = finalPrice || 0

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-[#36B37E]" /> Installments & Payments</span>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Record Payment
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-green-50">
              <p className="text-xs text-gray-500">Advance</p>
              <p className="text-lg font-bold text-[#36B37E]">{formatCurrency(advanceReceived)}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50">
              <p className="text-xs text-gray-500">Total Paid</p>
              <p className="text-lg font-bold text-[#4F8EF7]">{formatCurrency(totalPaid)}</p>
            </div>
            {totalPrice > 0 && (
              <>
                <div className="p-3 rounded-xl bg-amber-50">
                  <p className="text-xs text-gray-500">Final Price</p>
                  <p className="text-lg font-bold text-[#FFB648]">{formatCurrency(totalPrice)}</p>
                </div>
                <div className={`p-3 rounded-xl ${(remainingAmount || totalPrice - totalPaid) > 0 ? "bg-red-50" : "bg-green-50"}`}>
                  <p className="text-xs text-gray-500">Remaining</p>
                  <p className={`text-lg font-bold ${(remainingAmount || totalPrice - totalPaid) > 0 ? "text-[#F45D5D]" : "text-[#36B37E]"}`}>
                    {formatCurrency(remainingAmount ?? totalPrice - totalPaid)}
                  </p>
                </div>
              </>
            )}
          </div>

          {installments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No installment payments recorded</p>
          ) : (
            <div className="space-y-2">
              {installments.map((inst: any) => (
                <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-50 text-[#36B37E]">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(inst.amount)}</p>
                      {inst.notes && <p className="text-xs text-gray-400">{inst.notes}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(inst.date || inst.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Record Installment Payment" size="sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Amount *</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment notes..."
            />
          </div>
          <Button
            className="w-full"
            onClick={() => addInstallmentMutation.mutate({ amount: parseFloat(amount), notes: notes || undefined })}
            disabled={addInstallmentMutation.isPending || !amount}
          >
            <Plus className="h-4 w-4 mr-1" /> Record Payment
          </Button>
        </div>
      </Modal>
    </>
  )
}
