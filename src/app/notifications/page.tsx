"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDateTime } from "@/lib/utils"
import { Bell, CheckCheck, ExternalLink } from "lucide-react"
import Link from "next/link"
import type { Notification } from "@/types"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchNotifications() }, [])

  async function fetchNotifications() {
    try {
      const res = await api.get<{ notifications: Notification[]; unreadCount: number }>("/notifications")
      setNotifications(res.notifications)
    } catch {} finally { setLoading(false) }
  }

  async function markAsRead(id: string) {
    try {
      await api.patch("/notifications", { id })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch {}
  }

  async function markAllAsRead() {
    try {
      await api.patch("/notifications", { id: "all" })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {}
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-7 w-7 text-gray-300" />}
          title="No notifications"
          description="You're all caught up"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl border p-4 transition-colors ${
                n.isRead ? "border-gray-100" : "border-[#4F8EF7]/20 bg-[#F8FBFF]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0" onClick={() => !n.isRead && markAsRead(n.id)}>
                  <div className="flex items-center gap-2 mb-1">
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-[#4F8EF7] flex-shrink-0" />}
                    <h3 className={`text-sm ${n.isRead ? "text-gray-900" : "text-gray-900 font-semibold"}`}>
                      {n.title}
                    </h3>
                  </div>
                  {n.message && <p className="text-sm text-gray-500 ml-4">{n.message}</p>}
                  <p className="text-xs text-gray-400 mt-1 ml-4">{formatDateTime(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {n.link && (
                    <Link href={n.link} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
