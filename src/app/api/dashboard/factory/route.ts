import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const now = new Date()

    const activeOrders = await prisma.workOrder.findMany({
      where: { status: { in: ["IN_PRODUCTION", "PRODUCTION_STARTED"] } },
      include: {
        customer: { select: { name: true, phone: true } },
        workerAssignments: {
          include: { user: { select: { id: true, name: true, role: true } } },
          take: 10,
        },
        productionStages: {
          where: { status: { in: ["IN_PROGRESS", "DELAYED"] } },
          orderBy: { sortOrder: "asc" },
        },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    })

    const productionQueue = await prisma.workOrder.findMany({
      where: { status: { in: ["MATERIAL_REVIEW", "READY_FOR_PRODUCTION", "DESIGN_APPROVED"] } },
      include: {
        customer: { select: { name: true } },
        materials: { where: { status: { not: "APPROVED" } }, select: { id: true, materialName: true, status: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    })

    const delayedOrders = await prisma.workOrder.findMany({
      where: {
        OR: [
          { isDelayed: true },
          { dueDate: { lt: now }, status: { notIn: ["DELIVERED", "CLOSED", "CANCELLED"] } },
        ],
      },
      include: {
        customer: { select: { name: true } },
        productionStages: {
          where: { isDelayed: true },
          select: { stageName: true, delayMinutes: true },
        },
        delayAlerts: { where: { isResolved: false }, take: 3, orderBy: { createdAt: "desc" } },
      },
      orderBy: { delayDays: "desc" },
      take: 20,
    })

    const nowStart = new Date(now)
    nowStart.setHours(0, 0, 0, 0)
    const nowEnd = new Date(now)
    nowEnd.setHours(23, 59, 59, 999)

    const activeWorkers = await prisma.scheduleEvent.findMany({
      where: {
        startTime: { gte: nowStart, lte: nowEnd },
        endTime: null,
      },
      include: {
        worker: { select: { id: true, name: true, role: true } },
        workOrder: { select: { id: true, workOrderId: true } },
      },
      distinct: ["workerId"],
    })

    const materialShortages = await prisma.workOrderMaterial.findMany({
      where: { status: { in: ["OUT_OF_STOCK", "PARTIALLY_AVAILABLE"] } },
      include: {
        workOrder: { select: { id: true, workOrderId: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    })

    const totalActive = activeOrders.length
    const totalInQueue = productionQueue.length
    const totalDelayed = delayedOrders.length
    const totalWorkers = activeWorkers.length

    const upcomingDeliveries = await prisma.workOrder.findMany({
      where: {
        dueDate: { gte: now, not: null },
        status: { notIn: ["DELIVERED", "CLOSED", "CANCELLED", "DRAFT"] },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    })

    const recentCompleted = await prisma.workOrder.findMany({
      where: { status: { in: ["DELIVERED", "CLOSED", "PRODUCTION_COMPLETED"] } },
      include: { customer: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    })

    const workerUtilization = await prisma.scheduleEvent.groupBy({
      by: ["workerId"],
      where: { startTime: { gte: nowStart, lte: nowEnd } },
      _count: { id: true },
    })

    const allWorkers = await prisma.user.findMany({
      where: { role: "LABOUR" as const, isActive: true },
      select: { id: true, name: true, role: true },
    })
    const utilizationData = allWorkers.map((w) => ({
      ...w,
      eventsToday: workerUtilization.find((u) => u.workerId === w.id)?._count.id || 0,
    }))

    const stageCompletionRates = await prisma.productionStage.groupBy({
      by: ["status"],
      _count: { id: true },
    })

    return NextResponse.json({
      stats: { totalActive, totalInQueue, totalDelayed, totalWorkers },
      activeOrders,
      productionQueue,
      delayedOrders,
      activeWorkers,
      materialShortages,
      upcomingDeliveries,
      recentCompleted,
      workerUtilization: utilizationData,
      stageCompletionRates,
    })
  } catch (error) {
    console.error("Factory dashboard fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
