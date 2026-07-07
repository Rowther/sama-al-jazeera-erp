import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, Check, X, AlertTriangle } from "lucide-react"

interface Props {
  workOrder: any
  user: any
  statusMutation: any
}

export function ProductionManagerBudgetSection({ workOrder, user, statusMutation }: Props) {
  const [showSetBudget, setShowSetBudget] = useState(false)
  const [pmBudgetInput, setPmBudgetInput] = useState("")
  const [showApprove, setShowApprove] = useState(false)

  const canManage = user?.role === "OWNER" || user?.role === "MANAGER"
  const canSet = user?.role === "OWNER" || user?.role === "PRODUCTION_MANAGER"
  const budgetSet = workOrder.productionManagerBudget != null
  const budgetApproved = workOrder.productionManagerBudgetApproved
  const exceedsBudget = budgetSet && workOrder.estimatedBudget && Number(workOrder.productionManagerBudget) > Number(workOrder.estimatedBudget)

  if (!canSet && !canManage && !budgetSet) return null

  return (
    <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-[#FFB648]" />
          <span className="text-sm font-semibold text-gray-700">Production Manager Budget</span>
        </div>
        {!budgetSet && canSet && (
          <Button size="sm" variant="outline" onClick={() => setShowSetBudget(!showSetBudget)}>
            <DollarSign className="h-3 w-3 mr-1" /> Set Budget
          </Button>
        )}
      </div>

      {showSetBudget && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              value={pmBudgetInput}
              onChange={(e) => setPmBudgetInput(e.target.value)}
              placeholder={`Max ${formatCurrency(workOrder.estimatedBudget || 0)}`}
              className="flex-1"
            />
            <Button size="sm" variant="success" onClick={() => {
              if (pmBudgetInput && Number(pmBudgetInput) > Number(workOrder.estimatedBudget)) {
                toast.error("PM budget cannot exceed estimated budget")
                return
              }
              statusMutation.mutate({ productionManagerBudget: pmBudgetInput || "0" })
              setShowSetBudget(false)
            }}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSetBudget(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          {pmBudgetInput && Number(pmBudgetInput) > Number(workOrder.estimatedBudget) && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Cannot exceed estimated budget of {formatCurrency(workOrder.estimatedBudget)}
            </p>
          )}
        </div>
      )}

      {budgetSet && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              PM Budget: <span className="font-semibold text-gray-900">{formatCurrency(workOrder.productionManagerBudget)}</span>
              {exceedsBudget && (
                <span className="ml-2 text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Exceeds estimated budget!
                </span>
              )}
            </span>
            {canSet && !budgetApproved && (
              <Button size="sm" variant="ghost" onClick={() => setShowSetBudget(true)}>Edit</Button>
            )}
          </div>
          {!budgetApproved && canManage && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="success" onClick={() => {
                statusMutation.mutate({ productionManagerBudgetApproved: true, productionManagerBudgetApprovedById: user.id })
                setShowApprove(false)
              }}>
                <Check className="h-3 w-3 mr-1" /> Approve Budget
              </Button>
            </div>
          )}
          {budgetApproved && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <Check className="h-3 w-3" /> Approved
            </span>
          )}
        </div>
      )}
    </div>
  )
}
