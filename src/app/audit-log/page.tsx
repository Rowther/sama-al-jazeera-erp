"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import { Shield, Search } from "lucide-react"
import type { AuditLog } from "@/types"

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const limit = 50

  useEffect(() => { fetchLogs() }, [page])

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set("action", search)
      const res = await api.get<{ logs: AuditLog[]; total: number }>(`/audit-logs?${params}`)
      setLogs(res.logs)
      setTotal(res.total)
    } catch {} finally { setLoading(false) }
  }

  function getActionColor(action: string): string {
    if (action.includes("CREATED") || action.includes("ADDED")) return "bg-green-100 text-green-700"
    if (action.includes("UPDATED") || action.includes("CHANGED")) return "bg-blue-100 text-blue-700"
    if (action.includes("DELETED") || action.includes("CANCELLED")) return "bg-red-100 text-red-700"
    return "bg-gray-100 text-gray-700"
  }

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Track all changes across the system</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Filter by action..."
          className="pl-9"
          onKeyDown={e => e.key === "Enter" && fetchLogs()}
        />
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-7 w-7 text-gray-300" />}
          title="No audit logs"
          description="System activity will appear here"
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {logs.map(log => (
              <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                      <span className="text-sm font-medium text-gray-900">{log.user?.name}</span>
                      <span className="text-xs text-gray-400">({log.user?.role?.replace("_", " ")})</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {log.entity}
                      {log.entityId && <span className="text-gray-400"> &bull; ID: {log.entityId.substring(0, 8)}...</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(log.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-50">
            <Pagination page={page} limit={limit} total={total} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  )
}
