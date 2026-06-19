import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId: user.userId, isRead: false },
      }),
    ])

    return NextResponse.json({ notifications, unreadCount }, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" },
    })
  } catch (error) {
    console.error("Notifications fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ message: "Notification ID is required" }, { status: 400 })
    }

    if (id === "all") {
      await prisma.notification.updateMany({
        where: { userId: user.userId },
        data: { isRead: true },
      })
    } else {
      const notification = await prisma.notification.findUnique({ where: { id } })
      if (!notification) {
        return NextResponse.json({ message: "Notification not found" }, { status: 404 })
      }
      if (notification.userId !== user.userId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notification update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}