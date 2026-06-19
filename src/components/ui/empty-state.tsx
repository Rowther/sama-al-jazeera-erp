import { cn } from "@/lib/utils"
import { Inbox, Lightbulb } from "lucide-react"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  hint?: string
  className?: string
}

export function EmptyState({ icon, title, description, action, hint, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-5 shadow-sm">
        {icon || <Inbox className="h-8 w-8 text-gray-300" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 text-center max-w-sm mb-6 leading-relaxed">{description}</p>
      )}
      {action && <div className="mb-4">{action}</div>}
      {hint && (
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl max-w-sm">
          <Lightbulb className="h-4 w-4 text-[#FFB648] mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 leading-relaxed">{hint}</p>
        </div>
      )}
    </div>
  )
}
