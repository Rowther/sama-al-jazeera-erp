"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, EyeOff, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const router = useRouter()
  const [health, setHealth] = useState<{ status: string; database: string; error?: string } | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'error', database: 'unknown', error: 'API unreachable' }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      const role = useAuthStore.getState().user?.role
      const dashboards: Record<string, string> = {
        OWNER: "/dashboard/owner",
        MANAGER: "/dashboard/manager",
        DESIGNER: "/dashboard/designer",
        INVENTORY_MANAGER: "/dashboard/inventory-manager",
        ACCOUNTANT: "/dashboard/accountant",
      }
      router.push(dashboards[role || ""] || "/dashboard/owner")
    } catch (err: any) {
      setError(err.message || "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#4F8EF7] mb-4 shadow-lg shadow-[#4F8EF7]/20">
            <span className="text-2xl font-bold text-white">FE</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sama al jazeera ERP</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {health && health.status !== 'healthy' && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div className="text-red-700">
              <p className="font-medium">Server issue detected</p>
              <p>Database: {health.database === 'connected' ? 'Connected' : 'Disconnected'}</p>
              {health.error && <p className="text-red-500">{health.error}</p>}
              <p className="text-xs mt-1 text-red-400">Check server logs for details</p>
            </div>
          </div>
        )}

        {health && health.status === 'healthy' && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <div className="text-green-700">
              <p className="font-medium">All systems operational</p>
              <p>Database: Connected</p>
            </div>
          </div>
        )}

        {!health && (
          <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-gray-400 mt-0.5 shrink-0 animate-spin" />
            <div className="text-gray-500">
              <p>Checking server status...</p>
            </div>
          </div>
        )}

        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-[#F45D5D] text-sm p-3 rounded-xl">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-[#4F8EF7] font-medium hover:underline">
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
