import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest, getSessionFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request)
    if (!payload) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const sessionId = getSessionFromRequest(request)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, avatar: true, phone: true, refreshToken: true },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (user.refreshToken && sessionId && user.refreshToken !== sessionId) {
      return NextResponse.json({ message: "Session expired. Logged in from another device." }, { status: 401 })
    }

    const { refreshToken, ...safeUser } = user
    return NextResponse.json({ user: safeUser })
  } catch (error) {
    console.error("Me error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
