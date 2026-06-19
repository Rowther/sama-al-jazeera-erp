"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import type { Role } from "@/types"
import { ROLES } from "@/lib/constants"
import Link from "next/link"

export default function RegisterPage() {
  const [form, setForm] = useState<{ name: string; email: string; password: string; role: Role }>({ name: "", email: "", password: "", role: "DESIGNER" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { register } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await register(form)
      router.push("/dashboard/owner")
    } catch (err: any) {
      setError(err.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const roleOptions = Object.entries(ROLES).map(([value, label]) => ({ value, label }))

  return (
    <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#4F8EF7] mb-4 shadow-lg shadow-[#4F8EF7]/20">
            <span className="text-2xl font-bold text-white">FE</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Register for Sama al jazeera ERP</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-[#F45D5D] text-sm p-3 rounded-xl">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Role</label>
                <Select
                  options={roleOptions}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[#4F8EF7] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
