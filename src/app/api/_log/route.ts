import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { userId, action, entity, entityId } = await request.json()

    if (!userId || !action || !entity) {
      return NextResponse.json({ message: "userId, action, and entity are required" }, { status: 400 })
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null
    const userAgent = request.headers.get("user-agent") || null

    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId: entityId || null,
          ip,
          userAgent,
        },
      }),
      prisma.userSession.updateMany({
        where: { userId, logoutAt: null },
        data: { lastActivityAt: new Date() },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Log error:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
