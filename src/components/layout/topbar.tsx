"use client"

import { useEffect, useState } from "react"
import { useUIStore } from "@/stores/uiStore"
import { useAuthStore } from "@/stores/authStore"
import { Avatar } from "@/components/ui/avatar"
import { Bell, Search, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

export function Topbar() {
  const toggleSidebar = useUIStore(s => s.toggleSidebar)
  const user = useAuthStore(s => s.user)
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get<{ unreadCount: number }>("/notifications")
        setUnreadCount(res.unreadCount || 0)
      } catch {}
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className="h-9 w-64 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8EF7] focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/notifications')}
          className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-[#F45D5D] text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => router.push('/settings')}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Avatar name={user?.name} size="sm" />
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.role?.replace('_', ' ')}</p>
          </div>
        </button>
      </div>
    </header>
  )
}
