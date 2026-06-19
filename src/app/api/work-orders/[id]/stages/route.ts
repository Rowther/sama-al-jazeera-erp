import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

const DEFAULT_STAGES = [
  { name: "Cutting", department: "Production", sortOrder: 1 },
  { name: "Edge Banding", department: "Production", sortOrder: 2 },
  { name: "Assembly", department: "Production", sortOrder: 3 },
  { name: "Sanding", department: "Finishing", sortOrder: 4 },
  { name: "Painting", department: "Finishing", sortOrder: 5 },
  { name: "Polishing", department: "Finishing", sortOrder: 6 },
  { name: "Upholstery", department: "Upholstery", sortOrder: 7 },
  { name: "Installation", department: "Installation", sortOrder: 8 },
  { name: "Quality Check", department: "QA", sortOrder: 9 },
  { name: "Packaging", department: "Packaging", sortOrder: 10 },
]

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const { searchParams } = new URL(request.url)
    const workOrderItemId = searchParams.get("workOrderItemId")
    const where: Record<string, unknown> = { workOrderId: params.id }
    if (workOrderItemId) where.workOrderItemId = workOrderItemId

    const stages = await prisma.productionStage.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        laborEntries: {
          include: { worker: { select: { id: true, name: true, role: true } } },
        },
      },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ stages })
  } catch (error) {
    console.error("Stages fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "PRODUCTION_MANAGER"])
    if (error) return error

    const data = await request.json()
    const { action } = data

    if (action === "INITIALIZE") {
      const existing = await prisma.productionStage.count({ where: { workOrderId: params.id } })
      if (existing > 0) {
        return NextResponse.json({ message: "Stages already initialized" }, { status: 400 })
      }

      const { workOrderItemId } = data

      const stages = await prisma.productionStage.createManyAndReturn({
        data: DEFAULT_STAGES.map((s) => ({
          workOrderId: params.id,
          workOrderItemId: workOrderItemId || undefined,
          stageName: s.name,
          department: s.department,
          sortOrder: s.sortOrder,
        })),
      })

      await prisma.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: "STAGES_INITIALIZED",
          description: `Production stages initialized with ${stages.length} stages`,
        },
      })

      return NextResponse.json({ stages }, { status: 201 })
    }

    if (action === "START_STAGE") {
      const { stageId, workOrderItemId: _workOrderItemId } = data
      if (!stageId) return NextResponse.json({ message: "stageId is required" }, { status: 400 })

      await prisma.productionStage.update({
        where: { id: stageId },
        data: {
          status: "IN_PROGRESS",
          startTime: new Date(),
          ...(_workOrderItemId && { workOrderItemId: _workOrderItemId }),
        },
      })

      return NextResponse.json({ message: "Stage started" })
    }

    if (action === "COMPLETE_STAGE") {
      const { stageId, notes, qualityStatus, workOrderItemId: _workOrderItemId } = data
      if (!stageId) return NextResponse.json({ message: "stageId is required" }, { status: 400 })

      const stage = await prisma.productionStage.findUnique({ where: { id: stageId } })
      if (!stage) return NextResponse.json({ message: "Stage not found" }, { status: 404 })

      const now = new Date()
      const duration = stage.startTime ? Math.round((now.getTime() - stage.startTime.getTime()) / 60000) : 0

      await prisma.productionStage.update({
        where: { id: stageId },
        data: {
          status: "COMPLETED",
          endTime: now,
          duration,
          completionPercentage: 100,
          ...(notes && { notes }),
          ...(qualityStatus && { qualityStatus }),
          ...(_workOrderItemId && { workOrderItemId: _workOrderItemId }),
        },
      })

      const nextStage = await prisma.productionStage.findFirst({
        where: { workOrderId: params.id, sortOrder: stage.sortOrder + 1, status: "PENDING" },
      })
      if (nextStage) {
        await prisma.productionStage.update({
          where: { id: nextStage.id },
          data: { status: "IN_PROGRESS", startTime: new Date() },
        })
      }

      const allStages = await prisma.productionStage.findMany({
        where: { workOrderId: params.id },
        orderBy: { sortOrder: "asc" },
      })
      const allCompleted = allStages.every((s) => s.status === "COMPLETED" || s.status === "SKIPPED")
      if (allCompleted && allStages.length > 0) {
        await prisma.workOrder.update({
          where: { id: params.id },
          data: { productionCompletedAt: now },
        })
      }

      await prisma.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: "STAGE_COMPLETED",
          description: `Stage "${stage.stageName}" completed`,
          metadata: { stageName: stage.stageName, duration },
        },
      })

      return NextResponse.json({ message: "Stage completed", nextStageAutoStarted: !!nextStage, allCompleted })
    }

    if (action === "DELAY_STAGE") {
      const { stageId, delayMinutes, notes, workOrderItemId: _workOrderItemId } = data
      if (!stageId) return NextResponse.json({ message: "stageId is required" }, { status: 400 })

      await prisma.productionStage.update({
        where: { id: stageId },
        data: {
          status: "DELAYED",
          isDelayed: true,
          delayMinutes: delayMinutes || 0,
          notes,
          ...(_workOrderItemId && { workOrderItemId: _workOrderItemId }),
        },
      })

      await prisma.workOrder.update({
        where: { id: params.id },
        data: { isDelayed: true },
      })

      const managersAndOwners = await prisma.user.findMany({
        where: { role: { in: ["OWNER", "MANAGER"] }, isActive: true },
      })
      if (managersAndOwners.length > 0) {
        await prisma.notification.createMany({
          data: managersAndOwners.map((u) => ({
            userId: u.id,
            type: "STAGE_DELAYED",
            title: "Production Stage Delayed",
            message: `Stage delayed on work order`,
            link: `/work-orders/${params.id}`,
          })),
        })
      }

      return NextResponse.json({ message: "Stage marked as delayed" })
    }

    if (action === "UPDATE_PROGRESS") {
      const { stageId, progress, workOrderItemId: _workOrderItemId } = data
      if (!stageId) return NextResponse.json({ message: "stageId is required" }, { status: 400 })

      await prisma.productionStage.update({
        where: { id: stageId },
        data: {
          completionPercentage: progress,
          ...(_workOrderItemId && { workOrderItemId: _workOrderItemId }),
        },
      })

      return NextResponse.json({ message: "Progress updated" })
    }

    if (action === "ASSIGN_WORKER") {
      const { stageId, userId, workOrderItemId: _workOrderItemId } = data
      if (!stageId || !userId) return NextResponse.json({ message: "stageId and userId required" }, { status: 400 })

      await prisma.productionStage.update({
        where: { id: stageId },
        data: {
          assignedToId: userId,
          ...(_workOrderItemId && { workOrderItemId: _workOrderItemId }),
        },
      })

      return NextResponse.json({ message: "Worker assigned to stage" })
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Stages action error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
