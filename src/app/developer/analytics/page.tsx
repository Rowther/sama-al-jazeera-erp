"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { DataTable, type Column } from "@/components/ui/data-table"
import { formatDateTime } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts"
import {
  Users, Activity, Clock, LogIn, Shield, Search, Filter,
  Terminal, RefreshCw, UserCheck, AlertTriangle,
} from "lucide-react"

const PIE_COLORS = ["#4F8EF7", "#36B37E", "#FFB648", "#F45D5D", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"]

interface UserInfo {
  id: string; name: string; email: string; role: string; isActive?: boolean; lastLogin?: string
}

interface AnalyticsData {
  overview: {
    totalUsers: number; totalSessions: number; activeSessions: number
    totalDurationMinutes: number; avgDurationMinutes: number; totalActions: number
  }
  users: UserInfo[]
  usersByRole: { role: string; count: number }[]
  sessions: any[]
  recentActivity: any[]
  topActions: { action: string; count: number }[]
  topEntities: { entity: string; count: number }[]
  mostActiveUsers: { user: UserInfo | null; totalActions: number }[]
  loginsByDate: { date: string; count: number }[]
}

export default function DeveloperAnalyticsPage() {
  const user = useAuthStore(s => s.user)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("all")
  const [selectedUser, setSelectedUser] = useState("")
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "activity" | "sessions">("overview")

  useEffect(() => {
    if (user?.email !== "owner.test@sys.local") return
    fetchData()
  }, [period, selectedUser, user])

  async function fetchData() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (selectedUser) params.set("userId", selectedUser)
      const res = await api.get<AnalyticsData>(`/developer/analytics?${params}`)
      setData(res)
    } catch {} finally { setLoading(false) }
  }

  if (user?.email !== "owner.test@sys.local") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-red-300 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-500">Only the developer account can access this page.</p>
        </div>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!data) return null

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Activity },
    { id: "users" as const, label: "Users", icon: Users },
    { id: "activity" as const, label: "Activity Log", icon: Terminal },
    { id: "sessions" as const, label: "Sessions", icon: Clock },
  ]

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h ${m}m`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">System-wide user activity & performance monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-[#4F8EF7]/30 focus:border-[#4F8EF7] appearance-none cursor-pointer min-w-[180px]"
            >
              <option value="">All Users</option>
              {data.users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {["all", "today", "week", "month"].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  period === p ? "bg-[#4F8EF7] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{data.overview.totalUsers}</p>
              </div>
              <div className="rounded-xl p-3 bg-[#EEF4FF] text-[#4F8EF7]">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Active Sessions</p>
                <p className="text-3xl font-bold text-gray-900">{data.overview.activeSessions}</p>
                <p className="text-xs text-gray-400">currently logged in</p>
              </div>
              <div className="rounded-xl p-3 bg-green-50 text-[#36B37E]">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Avg Session</p>
                <p className="text-3xl font-bold text-gray-900">{formatDuration(data.overview.avgDurationMinutes)}</p>
                <p className="text-xs text-gray-400">{formatDuration(data.overview.totalDurationMinutes)} total</p>
              </div>
              <div className="rounded-xl p-3 bg-amber-50 text-[#FFB648]">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Total Actions</p>
                <p className="text-3xl font-bold text-gray-900">{data.overview.totalActions}</p>
                <p className="text-xs text-gray-400">{data.overview.totalSessions} sessions tracked</p>
              </div>
              <div className="rounded-xl p-3 bg-purple-50 text-[#8B5CF6]">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? "text-[#4F8EF7] border-b-2 border-[#4F8EF7] bg-[#EEF4FF]/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LogIn className="h-4 w-4 text-[#4F8EF7]" /> Logins Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.loginsByDate.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No login data yet</div>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.loginsByDate}>
                        <defs>
                          <linearGradient id="loginGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#4F8EF7" fill="url(#loginGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#4F8EF7]" /> Users by Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.usersByRole.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No users</div>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.usersByRole}
                          dataKey="count"
                          nameKey="role"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ role, count }) => `${role.replace(/_/g, " ")} (${count})`}
                          labelLine={false}
                        >
                          {data.usersByRole.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[#4F8EF7]" /> Top Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topActions.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No activity yet</div>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.topActions.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="action" tick={{ fontSize: 11 }} width={80} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#4F8EF7" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#4F8EF7]" /> Most Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.mostActiveUsers.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No activity yet</div>
                ) : (
                  <div className="space-y-3">
                    {data.mostActiveUsers.slice(0, 6).map((u, i) => (
                      <div key={u.user?.id || i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-400 w-5">{i + 1}.</span>
                          <Avatar name={u.user?.name || "Unknown"} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{u.user?.name || "Unknown"}</p>
                            <p className="text-xs text-gray-400">{u.user?.role?.replace(/_/g, " ")}</p>
                          </div>
                        </div>
                        <Badge className="bg-[#EEF4FF] text-[#4F8EF7]">{u.totalActions} actions</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {data.users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gray-100 text-gray-700">{u.role.replace(/_/g, " ")}</Badge>
                    {u.isActive === false && (
                      <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                    )}
                    {u.lastLogin && (
                      <span className="text-xs text-gray-400">{formatDateTime(u.lastLogin)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "activity" && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {data.recentActivity.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">No activity recorded yet</div>
              ) : (
                data.recentActivity.map((log: any, i: number) => (
                  <div key={log.id || i} className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
                    <div className="mt-0.5">
                      <Activity className={`h-4 w-4 ${
                        log.action === "LOGIN" ? "text-green-500" :
                        log.action === "LOGOUT" ? "text-gray-400" :
                        log.action === "CREATE" ? "text-[#4F8EF7]" :
                        log.action === "UPDATE" ? "text-[#FFB648]" :
                        log.action === "DELETE" ? "text-[#F45D5D]" :
                        "text-gray-400"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{log.user?.name || "System"}</span>
                        <Badge className={`text-xs ${
                          log.action === "LOGIN" ? "bg-green-100 text-green-700" :
                          log.action === "LOGOUT" ? "bg-gray-100 text-gray-700" :
                          log.action === "CREATE" ? "bg-blue-100 text-blue-700" :
                          log.action === "UPDATE" ? "bg-amber-100 text-amber-700" :
                          log.action === "DELETE" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>{log.action}</Badge>
                        <Badge className="bg-gray-50 text-gray-500 text-xs">{log.entity}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "sessions" && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {data.sessions.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">No sessions recorded yet</div>
              ) : (
                data.sessions.map((s: any, i: number) => (
                  <div key={s.id || i} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.user?.name || "Unknown"} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.user?.name || "Unknown"}</p>
                        <p className="text-xs text-gray-400">
                          {formatDateTime(s.loginAt)}
                          {s.logoutAt ? ` - ${formatDateTime(s.logoutAt)}` : " (active)"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!s.logoutAt && <Badge className="bg-green-100 text-green-700">Active</Badge>}
                      <span className="text-sm text-gray-500">{formatDuration(s.durationMinutes)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
