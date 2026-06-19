"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/authStore"
import { useUIStore } from "@/stores/uiStore"
import { NAV_ITEMS } from "@/lib/constants"
import {
  LayoutDashboard, ClipboardList, BarChart3, Users, Wallet, Landmark,
  Package, Settings, PlusCircle, PenTool, ShoppingCart, Building2,
  Receipt, CreditCard, FileText, ChevronLeft, LogOut, Menu,
  AlertTriangle, X, Search, ClipboardCheck, Bell, Calendar, Factory
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="h-5 w-5" />,
  ClipboardList: <ClipboardList className="h-5 w-5" />,
  BarChart3: <BarChart3 className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  Wallet: <Wallet className="h-5 w-5" />,
  Landmark: <Landmark className="h-5 w-5" />,
  Package: <Package className="h-5 w-5" />,
  Settings: <Settings className="h-5 w-5" />,
  PlusCircle: <PlusCircle className="h-5 w-5" />,
  PenTool: <PenTool className="h-5 w-5" />,
  ShoppingCart: <ShoppingCart className="h-5 w-5" />,
  Building2: <Building2 className="h-5 w-5" />,
  Receipt: <Receipt className="h-5 w-5" />,
  CreditCard: <CreditCard className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  Search: <Search className="h-5 w-5" />,
  ClipboardCheck: <ClipboardCheck className="h-5 w-5" />,
  Bell: <Bell className="h-5 w-5" />,
  Calendar: <Calendar className="h-5 w-5" />,
  Factory: <Settings className="h-5 w-5" />,
}

export function Sidebar() {
  const pathname = usePathname()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const sidebarOpen = useUIStore(s => s.sidebarOpen)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)

  if (!user) return null

  const navItems = NAV_ITEMS[user.role as keyof typeof NAV_ITEMS] || []

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={toggleSidebar} />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-100 transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:w-16 lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className={cn("flex items-center gap-3", !sidebarOpen && "lg:hidden")}>
            <div className="h-8 w-8 rounded-lg bg-[#4F8EF7] flex items-center justify-center">
              <span className="text-white font-bold text-sm">FE</span>
            </div>
            <span className="font-semibold text-gray-900">Sama al jazeera</span>
          </div>
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 lg:block hidden">
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
          </button>
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={cn("p-4 border-b border-gray-50", !sidebarOpen && "lg:hidden")}>
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-[#EEF4FF] text-[#4F8EF7]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  !sidebarOpen && "lg:justify-center lg:px-2"
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                {iconMap[item.icon] || <LayoutDashboard className="h-5 w-5" />}
                <span className={cn(!sidebarOpen && "lg:hidden")}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={cn("p-3 border-t border-gray-100", !sidebarOpen && "lg:hidden")}>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
