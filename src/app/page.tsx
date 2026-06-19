"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  useEffect(() => { router.replace("/auth/login") }, [router])
  return (
    <div className="h-screen bg-[#F8F8F7] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#4F8EF7] animate-pulse" />
        <p className="text-sm text-gray-400">Redirecting...</p>
      </div>
    </div>
  )
}
