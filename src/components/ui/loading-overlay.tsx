"use client"

import { cn } from "@/lib/utils"

interface LoadingOverlayProps {
  visible: boolean
  message?: string
  className?: string
}

export function LoadingOverlay({ visible, message, className }: LoadingOverlayProps) {
  if (!visible) return null

  return (
    <div className={cn("absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20 rounded-2xl", className)}>
      <div className="flex flex-col items-center gap-2">
        <div className="h-7 w-7 rounded-lg border-2 border-[#4F8EF7] border-t-transparent animate-spin" />
        {message && <p className="text-xs text-gray-500">{message}</p>}
      </div>
    </div>
  )
}
