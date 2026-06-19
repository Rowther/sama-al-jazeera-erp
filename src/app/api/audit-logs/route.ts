import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER"])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const entity = searchParams.get("entity")
    const action = searchParams.get("action")
    const userId = searchParams.get("userId")

    const where: Record<string, unknown> = {}
    if (entity) where.entity = entity
    if (action) where.action = action
    if (userId) where.userId = userId

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50")), 200)
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({ logs, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("Audit logs fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const data = await request.json()

    if (!data.action || !data.entity) {
      return NextResponse.json({ message: "Action and entity are required" }, { status: 400 })
    }

    const log = await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId || null,
        oldValue: data.oldValue || null,
        newValue: data.newValue || null,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        userAgent: request.headers.get("user-agent") || null,
      },
      include: { user: { select: { id: true, name: true, role: true } } },
    })

    return NextResponse.json({ log }, { status: 201 })
  } catch (error) {
    console.error("Audit log create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}