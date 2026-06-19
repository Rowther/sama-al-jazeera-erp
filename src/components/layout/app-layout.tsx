"use client"

import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { useAuthStore } from "@/stores/authStore"
import { useUIStore } from "@/stores/uiStore"
import { usePathname, redirect } from "next/navigation"
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { TutorialProvider } from "@/components/tutorial/TutorialProvider"

const publicPaths = ["/auth/login", "/auth/register"]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isLoading = useAuthStore(s => s.isLoading)
  const checkAuth = useAuthStore(s => s.checkAuth)
  const sidebarOpen = useUIStore(s => s.sidebarOpen)
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="h-screen bg-[#F8F8F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#4F8EF7] animate-pulse" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !publicPaths.includes(pathname)) {
    redirect("/auth/login")
  }

  if (isAuthenticated && publicPaths.includes(pathname)) {
    redirect("/dashboard/owner")
  }

  const isPublic = publicPaths.includes(pathname)

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7]">
      <Sidebar />
      <div className={cn("transition-all duration-300", sidebarOpen ? "lg:ml-64" : "lg:ml-16")}>
        <Topbar />
        <main className="p-4 lg:p-6">
          <TutorialProvider>{children}</TutorialProvider>
        </main>
      </div>
    </div>
  )
}
