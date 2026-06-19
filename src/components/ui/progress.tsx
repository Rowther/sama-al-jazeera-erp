import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: "default" | "success" | "warning" | "danger"
}

const variantColors = {
  default: "bg-[#4F8EF7]",
  success: "bg-[#36B37E]",
  warning: "bg-[#FFB648]",
  danger: "bg-[#F45D5D]",
}

function Progress({ className, value, max = 100, variant = "default", ...props }: ProgressProps) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className={cn("h-2 w-full rounded-full bg-gray-100", className)} {...props}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", variantColors[variant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export { Progress }
