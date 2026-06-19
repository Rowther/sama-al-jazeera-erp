import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const alerts = await prisma.delayAlert.findMany({
      where: { workOrderId: params.id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "PRODUCTION_MANAGER"])
    if (error) return error

    const data = await request.json()
    const { alertType, message } = data

    if (!message) {
      return NextResponse.json({ message: "Message is required" }, { status: 400 })
    }

    const alert = await prisma.delayAlert.create({
      data: {
        workOrderId: params.id,
        alertType: alertType || "DELAYED_PRODUCTION",
        message,
        createdById: user.userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    })

    await prisma.workOrder.update({
      where: { id: params.id },
      data: { isDelayed: true, delayDays: { increment: 1 } },
    })

    const managersAndOwners = await prisma.user.findMany({
      where: { role: { in: ["OWNER", "MANAGER"] }, isActive: true },
    })
    if (managersAndOwners.length > 0) {
      await prisma.notification.createMany({
        data: managersAndOwners.map((m) => ({
          userId: m.id,
          type: "WORK_ORDER_DELAYED",
          title: "Work Order Delayed",
          message,
          link: `/work-orders/${params.id}`,
        })),
      })
    }

    return NextResponse.json({ alert }, { status: 201 })
  } catch (error) {
    console.error("Delay alert error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
