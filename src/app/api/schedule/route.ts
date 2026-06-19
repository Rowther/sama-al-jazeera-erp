import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view") || "day"
    const date = searchParams.get("date")
    const workerId = searchParams.get("workerId")

    const queryDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(queryDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(queryDate)
    endOfDay.setHours(23, 59, 59, 999)

    let startDate = startOfDay
    let endDate = endOfDay

    if (view === "week") {
      const dayOfWeek = queryDate.getDay()
      const monday = new Date(queryDate)
      monday.setDate(queryDate.getDate() - ((dayOfWeek + 6) % 7))
      monday.setHours(0, 0, 0, 0)
      startDate = monday
      endDate = new Date(monday)
      endDate.setDate(monday.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
    }

    const where: Record<string, unknown> = {
      startTime: { gte: startDate, lte: endDate },
    }
    if (workerId) where.workerId = workerId

    const events = await prisma.scheduleEvent.findMany({
      where,
      include: {
        worker: { select: { id: true, name: true, role: true } },
        workOrder: { select: { id: true, workOrderId: true, customer: { select: { name: true } } } },
        productionStage: { select: { id: true, stageName: true, status: true } },
      },
      orderBy: { startTime: "asc" },
    })

    const workers = await prisma.user.findMany({
      where: { role: "LABOUR" as const, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    })

    const conflicts: any[] = []
    const workerSchedule: Record<string, any[]> = {}
    for (const evt of events) {
      if (!workerSchedule[evt.workerId]) workerSchedule[evt.workerId] = []
      workerSchedule[evt.workerId].push(evt)
    }
    for (const [wid, evts] of Object.entries(workerSchedule)) {
      if (evts.length > 1) {
        for (let i = 0; i < evts.length; i++) {
          for (let j = i + 1; j < evts.length; j++) {
            const a = evts[i] as any
            const b = evts[j] as any
            const aEnd = a.endTime ? new Date(a.endTime).getTime() : new Date(a.startTime).getTime() + 28800000
            const bEnd = b.endTime ? new Date(b.endTime).getTime() : new Date(b.startTime).getTime() + 28800000
            if (
              new Date(a.startTime).getTime() < bEnd &&
              aEnd > new Date(b.startTime).getTime()
            ) {
              conflicts.push({
                workerId: wid,
                workerName: a.worker?.name,
                eventA: { id: a.id, workOrderId: a.workOrder?.workOrderId, time: a.startTime },
                eventB: { id: b.id, workOrderId: b.workOrder?.workOrderId, time: b.startTime },
              })
            }
          }
        }
      }
    }

    return NextResponse.json({ events, workers, conflicts, date: queryDate.toISOString() })
  } catch (error) {
    console.error("Schedule fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "PRODUCTION_MANAGER"])
    if (error) return error

    const data = await request.json()
    const { workOrderId, workerId, productionStageId, stageName, shiftLabel, startTime, endTime, isOvertime, notes } = data

    if (!workOrderId || !workerId || !startTime) {
      return NextResponse.json({ message: "Work order, worker, and start time are required" }, { status: 400 })
    }

    const event = await prisma.scheduleEvent.create({
      data: {
        workOrderId,
        workerId,
        productionStageId: productionStageId || null,
        stageName: stageName || null,
        shiftLabel: shiftLabel || "DAY",
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        isOvertime: isOvertime || false,
        notes: notes || null,
      },
      include: {
        worker: { select: { id: true, name: true, role: true } },
        workOrder: { select: { id: true, workOrderId: true } },
      },
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error("Schedule create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "PRODUCTION_MANAGER"])
    if (error) return error

    const data = await request.json()
    const { id, ...updates } = data

    if (!id) {
      return NextResponse.json({ message: "Event ID required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (updates.startTime) updateData.startTime = new Date(updates.startTime)
    if (updates.endTime) updateData.endTime = new Date(updates.endTime)
    if (updates.shiftLabel) updateData.shiftLabel = updates.shiftLabel
    if (updates.isOvertime !== undefined) updateData.isOvertime = updates.isOvertime
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.stageName) updateData.stageName = updates.stageName
    if (updates.workerId) updateData.workerId = updates.workerId

    const event = await prisma.scheduleEvent.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error("Schedule update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "PRODUCTION_MANAGER"])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ message: "Event ID required" }, { status: 400 })
    }

    await prisma.scheduleEvent.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Schedule delete error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
