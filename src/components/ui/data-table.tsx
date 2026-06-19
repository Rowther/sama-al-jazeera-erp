"use client"

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./table"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"
import { useState, useMemo } from "react"

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (item: T) => void
  emptyMessage?: string
}

function safeCompare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b)
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b))
}

export function DataTable<T extends Record<string, any>>({ columns, data, onRowClick, emptyMessage = "No data found" }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      return sortDir === "asc" ? safeCompare(aVal, bVal) : safeCompare(bVal, aVal)
    })
  }, [data, sortKey, sortDir])

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={cn(col.sortable && "cursor-pointer select-none", col.className)}>
              <button
                onClick={() => col.sortable && handleSort(col.key)}
                className="flex items-center gap-1"
              >
                {col.label}
                {col.sortable && (
                  sortKey === col.key
                    ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                    : <ChevronsUpDown className="h-3 w-3 opacity-30" />
                )}
              </button>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-gray-400 py-12">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((item, i) => (
            <TableRow
              key={item.id || i}
              className={cn(onRowClick && "cursor-pointer")}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render ? col.render(item) : item[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
