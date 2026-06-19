import { cn } from "@/lib/utils"
import { Card, CardContent } from "./card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Tooltip } from "@/components/tutorial/TooltipComponent"

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  variant?: "default" | "success" | "warning" | "danger"
  className?: string
  tooltip?: string
}

export function KPICard({ title, value, change, changeLabel, icon, variant = "default", className, tooltip }: KPICardProps) {
  const isPositive = change !== undefined && change !== null && change > 0

  const card = (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-sm font-medium",
                  isPositive ? "text-[#36B37E]" : "text-[#F45D5D]"
                )}>
                  {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {Math.abs(change)}%
                </span>
                {changeLabel && <span className="text-sm text-gray-400">{changeLabel}</span>}
              </div>
            )}
          </div>
          {icon && (
            <div className={cn(
              "rounded-xl p-3",
              variant === "success" && "bg-green-50 text-[#36B37E]",
              variant === "warning" && "bg-amber-50 text-[#FFB648]",
              variant === "danger" && "bg-red-50 text-[#F45D5D]",
              variant === "default" && "bg-[#EEF4FF] text-[#4F8EF7]"
            )}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (tooltip) {
    return <Tooltip content={tooltip}>{card}</Tooltip>
  }

  return card
}
