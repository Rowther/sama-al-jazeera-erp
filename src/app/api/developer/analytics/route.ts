import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

const DEV_EMAIL = "owner.test@sys.local"

export async function GET(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request)
    if (!payload) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    if (payload.email !== DEV_EMAIL) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const period = searchParams.get("period") || "all"

    const now = new Date()
    let dateFilter: Date | undefined
    if (period === "today") {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === "week") {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === "month") {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const userFilter = userId || undefined

    const sessionWhere: Record<string, unknown> = {}
    if (userFilter) sessionWhere.userId = userFilter
    if (dateFilter) sessionWhere.loginAt = { gte: dateFilter }

    const auditWhere: Record<string, unknown> = {}
    if (userFilter) auditWhere.userId = userFilter
    if (dateFilter) auditWhere.createdAt = { gte: dateFilter }

    const [
      totalUsers,
      usersByRole,
      activeSessions,
      totalSessions,
      sessionsData,
      auditLogs,
      actionCounts,
      entityCounts,
      userActivity,
      loginTimeline,
      usersList,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
      prisma.userSession.count({ where: { logoutAt: null, ...(userFilter ? { userId: userFilter } : {}) } }),
      prisma.userSession.count({ where: sessionWhere }),
      prisma.userSession.findMany({
        where: sessionWhere,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { loginAt: "desc" },
        take: 500,
      }),
      prisma.auditLog.findMany({
        where: auditWhere,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.auditLog.groupBy({
        by: ["action"],
        _count: { id: true },
        where: auditWhere,
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.auditLog.groupBy({
        by: ["entity"],
        _count: { id: true },
        where: auditWhere,
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.auditLog.groupBy({
        by: ["userId"],
        _count: { id: true },
        where: auditWhere,
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.auditLog.findMany({
        where: { ...auditWhere, action: "LOGIN" },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true },
        orderBy: { name: "asc" },
      }),
    ])

    const userIds = userActivity.map((ua: { userId: string }) => ua.userId)
    const userMapList = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, role: true },
        })
      : []
    const userMap = new Map(userMapList.map((u) => [u.id, u]))

    const userActivityDetails = userActivity.map((ua: { userId: string; _count: { id: number } }) => ({
      user: userMap.get(ua.userId) || null,
      totalActions: ua._count.id,
    }))

    const sessionsWithDuration = sessionsData.map((s: { logoutAt: Date | null; loginAt: Date; lastActivityAt: Date }) => {
      const durationMs = s.logoutAt
        ? s.logoutAt.getTime() - s.loginAt.getTime()
        : s.lastActivityAt.getTime() - s.loginAt.getTime()
      const durationMinutes = Math.round(durationMs / 60000)
      return { ...s, durationMinutes }
    })

    const totalDurationMinutes = sessionsWithDuration.reduce(
      (sum: number, s: { durationMinutes: number }) => sum + s.durationMinutes,
      0
    )
    const avgDurationMinutes = sessionsWithDuration.length > 0
      ? Math.round(totalDurationMinutes / sessionsWithDuration.length)
      : 0

    const loginsByDate: Record<string, number> = {}
    loginTimeline.forEach((l: { createdAt: Date }) => {
      const dateKey = l.createdAt.toISOString().split("T")[0]
      loginsByDate[dateKey] = (loginsByDate[dateKey] || 0) + 1
    })

    return NextResponse.json({
      overview: {
        totalUsers,
        totalSessions,
        activeSessions,
        totalDurationMinutes,
        avgDurationMinutes,
        totalActions: auditLogs.length,
      },
      usersByRole: usersByRole.map((r: { role: string; _count: { id: number } }) => ({ role: r.role, count: r._count.id })),
      users: usersList,
      sessions: sessionsWithDuration.slice(0, 100),
      recentActivity: auditLogs,
      topActions: actionCounts.map((a: { action: string; _count: { id: number } }) => ({ action: a.action, count: a._count.id })),
      topEntities: entityCounts.map((e: { entity: string; _count: { id: number } }) => ({ entity: e.entity, count: e._count.id })),
      mostActiveUsers: userActivityDetails.sort((a: { totalActions: number }, b: { totalActions: number }) => b.totalActions - a.totalActions),
      loginsByDate: Object.entries(loginsByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date)),
    })
  } catch (error) {
    console.error("Developer analytics error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
