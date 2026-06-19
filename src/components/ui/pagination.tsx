"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePagination } from "@/hooks/usePagination"

interface PaginationProps {
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, limit, total, onPageChange, className }: PaginationProps) {
  const { totalPages, hasNext, hasPrev, from, to } = usePagination(page, limit, total)

  if (totalPages <= 1) return null

  const pages: number[] = []
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    pages.push(i)
  }

  return (
    <div className={cn("flex items-center justify-between pt-4", className)}>
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-700">{from}</span> to{" "}
        <span className="font-medium text-gray-700">{to}</span> of{" "}
        <span className="font-medium text-gray-700">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages[0] > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className={cn(
                "h-8 w-8 rounded-lg text-sm font-medium transition-colors",
                page === 1 ? "bg-[#4F8EF7] text-white" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              1
            </button>
            {pages[0] > 2 && <span className="px-1 text-gray-400">...</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              "h-8 w-8 rounded-lg text-sm font-medium transition-colors",
              p === page ? "bg-[#4F8EF7] text-white" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className={cn(
                "h-8 w-8 rounded-lg text-sm font-medium transition-colors",
                page === totalPages ? "bg-[#4F8EF7] text-white" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
