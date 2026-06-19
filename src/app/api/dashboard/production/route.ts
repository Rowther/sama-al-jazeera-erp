import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const [
      activeOrders,
      productionQueue,
      delayedOrders,
      upcomingDeliveries,
      recentCompleted,
    ] = await Promise.all([
      prisma.workOrder.findMany({
        where: { status: { in: ["IN_PRODUCTION", "PRODUCTION_STARTED"] } },
        include: {
          customer: true,
          workerAssignments: { include: { user: { select: { id: true, name: true, role: true } } } },
          createdBy: { select: { id: true, name: true } },
          productionStages: {
            where: { status: { in: ["IN_PROGRESS", "DELAYED"] } },
            select: { id: true, stageName: true, status: true, isDelayed: true, department: true, completionPercentage: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.workOrder.findMany({
        where: { status: { in: ["MATERIAL_REVIEW", "READY_FOR_PRODUCTION", "DESIGN_APPROVED"] } },
        include: { customer: true, createdBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.workOrder.findMany({
        where: { isDelayed: true, status: { notIn: ["DELIVERED", "CLOSED", "CANCELLED"] } },
        include: { customer: true, createdBy: { select: { name: true } } },
        orderBy: { delayDays: "desc" },
        take: 50,
      }),
      prisma.workOrder.findMany({
        where: {
          dueDate: { not: null },
          status: { notIn: ["DELIVERED", "CLOSED", "CANCELLED"] },
        },
        include: { customer: true },
        orderBy: { dueDate: "asc" },
        take: 50,
      }),
      prisma.workOrder.findMany({
        where: { status: "PRODUCTION_COMPLETED" },
        include: { customer: true, createdBy: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
    ])

    const totalActive = activeOrders.length
    const totalInQueue = productionQueue.length
    const totalDelayed = delayedOrders.length
    const totalUpcoming = upcomingDeliveries.length

    return NextResponse.json({
      activeOrders,
      productionQueue,
      delayedOrders,
      upcomingDeliveries,
      recentCompleted,
      stats: { totalActive, totalInQueue, totalDelayed, totalUpcoming },
    })
  } catch (error) {
    console.error("Production dashboard error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
