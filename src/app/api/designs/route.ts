import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const where: any = {}
  if (user.role === "DESIGNER") {
    where.workOrder = { assignedToId: user.userId }
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
  const skip = (page - 1) * limit

  const [designs, total] = await Promise.all([
    prisma.design.findMany({
      where,
      include: { workOrder: { include: { customer: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.design.count({ where }),
  ])
  return NextResponse.json({ designs, total, page, totalPages: Math.ceil(total / limit) }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const data = await request.json()
  const design = await prisma.design.create({
    data: { workOrderId: data.workOrderId, title: data.title, description: data.description, files: data.files || [], createdById: user.userId },
  })

  const oldOrder = await prisma.workOrder.findUnique({ where: { id: data.workOrderId } })
  const newStatus = oldOrder?.status === "DESIGN_IN_PROGRESS" || oldOrder?.status === "DESIGN_ASSIGNED"
    ? "DESIGN_IN_PROGRESS"
    : "DESIGN_SUBMITTED"

  await prisma.workOrder.update({
    where: { id: data.workOrderId },
    data: { status: newStatus },
  })

  await prisma.activityHistory.create({
    data: {
      workOrderId: data.workOrderId, userId: user.userId, action: "DESIGN_UPLOADED",
      description: `Design "${data.title}" uploaded, status changed to ${newStatus}`,
    },
  })

  if (oldOrder && oldOrder.status !== newStatus) {
    const managers = await prisma.user.findMany({
      where: { role: { in: ["MANAGER", "OWNER"] }, isActive: true },
    })
    await prisma.notification.createMany({
      data: managers.map((m) => ({
        userId: m.id,
        type: "DESIGN_COMPLETED",
        title: "Design Uploaded",
        message: `A new design was uploaded for work order ${oldOrder.workOrderId}`,
        link: `/work-orders/${data.workOrderId}`,
      })),
    })
  }

  return NextResponse.json({ design }, { status: 201 })
}
