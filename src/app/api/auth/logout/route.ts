import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest, getSessionFromRequest } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request)
    if (!payload) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const sessionId = getSessionFromRequest(request)

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null
    const userAgent = request.headers.get("user-agent") || null

    const now = new Date()

    const operations = []

    if (sessionId) {
      const session = await prisma.userSession.findFirst({
        where: { userId: payload.userId, logoutAt: null, loginAt: { lte: now } },
        orderBy: { loginAt: "desc" },
      })

      if (session) {
        operations.push(
          prisma.userSession.update({
            where: { id: session.id },
            data: { logoutAt: now, lastActivityAt: now },
          })
        )
      }
    }

    operations.push(
      prisma.user.update({
        where: { id: payload.userId },
        data: { refreshToken: null },
      }),
      prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: "LOGOUT",
          entity: "USER",
          entityId: payload.userId,
          ip,
          userAgent,
        },
      })
    )

    await prisma.$transaction(operations)

    return NextResponse.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
