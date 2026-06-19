import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const { searchParams } = new URL(request.url)
    const workOrderItemId = searchParams.get("workOrderItemId")
    const where: Record<string, unknown> = { workOrderId: params.id }
    if (workOrderItemId) where.workOrderItemId = workOrderItemId

    const entries = await prisma.laborEntry.findMany({
      where,
      include: {
        worker: { select: { id: true, name: true, role: true } },
        productionStage: { select: { stageName: true } },
      },
      orderBy: { date: "desc" },
    })

    const totalLaborCost = entries.reduce((s, e) => s + e.totalCost, 0)

    return NextResponse.json({ entries, totalLaborCost })
  } catch (error) {
    console.error("Labor entries fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "PRODUCTION_MANAGER", "HR"])
    if (error) return error

    const data = await request.json()

    if (data.action === "ADD_ENTRY") {
      const { workerId, productionStageId, hoursWorked, hourlyRate, dailyRate, overtimeHours, overtimeRate, notes, workOrderItemId } = data

      if (!workerId || hoursWorked === undefined) {
        return NextResponse.json({ message: "workerId and hoursWorked required" }, { status: 400 })
      }

      const rate = hourlyRate || 0
      const overtime = overtimeHours || 0
      const overtimeRt = overtimeRate || rate * 1.5

      const regularCost = hoursWorked * rate
      const overtimeCost = overtime * overtimeRt
      const totalCost = regularCost + overtimeCost

      const entry = await prisma.laborEntry.create({
        data: {
          workOrderId: params.id,
          workOrderItemId: workOrderItemId || undefined,
          productionStageId: productionStageId || null,
          workerId,
          hoursWorked,
          hourlyRate: rate,
          dailyRate: dailyRate || 0,
          overtimeHours: overtime,
          overtimeRate: overtimeRt,
          totalCost,
          notes: notes || null,
        },
        include: {
          worker: { select: { id: true, name: true, role: true } },
          productionStage: { select: { stageName: true } },
        },
      })

      await prisma.workerAssignment.updateMany({
        where: { workOrderId: params.id, userId: workerId },
        data: {
          totalHoursWorked: { increment: hoursWorked + overtime },
          totalCost: { increment: totalCost },
        },
      })

      const agg = await prisma.laborEntry.aggregate({
        where: { workOrderId: params.id },
        _sum: { totalCost: true },
      })
      await prisma.workOrder.update({
        where: { id: params.id },
        data: { actualLaborCost: agg._sum.totalCost || 0 },
      })

      await prisma.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: "LABOR_ENTRY_ADDED",
          description: `Labor entry: ${hoursWorked}h for AED ${totalCost}`,
          metadata: { workerId, hoursWorked, totalCost },
        },
      })

      return NextResponse.json({ entry, totalLaborCost: agg._sum.totalCost || 0 }, { status: 201 })
    }

    if (data.action === "BULK_ADD") {
      const { entries } = data
      if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return NextResponse.json({ message: "entries array required" }, { status: 400 })
      }

      const created = []
      for (const e of entries) {
        const rate = e.hourlyRate || 0
        const overtime = e.overtimeHours || 0
        const overtimeRt = e.overtimeRate || rate * 1.5
        const totalCost = (e.hoursWorked || 0) * rate + overtime * overtimeRt

        const entry = await prisma.laborEntry.create({
          data: {
            workOrderId: params.id,
            workOrderItemId: e.workOrderItemId || undefined,
            productionStageId: e.productionStageId || null,
            workerId: e.workerId,
            hoursWorked: e.hoursWorked || 0,
            hourlyRate: rate,
            dailyRate: e.dailyRate || 0,
            overtimeHours: overtime,
            overtimeRate: overtimeRt,
            totalCost,
            notes: e.notes || null,
          },
        })
        created.push(entry)

        await prisma.workerAssignment.updateMany({
          where: { workOrderId: params.id, userId: e.workerId },
          data: {
            totalHoursWorked: { increment: (e.hoursWorked || 0) + overtime },
            totalCost: { increment: totalCost },
          },
        })
      }

      const agg = await prisma.laborEntry.aggregate({
        where: { workOrderId: params.id },
        _sum: { totalCost: true },
      })
      await prisma.workOrder.update({
        where: { id: params.id },
        data: { actualLaborCost: agg._sum.totalCost || 0 },
      })

      await prisma.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: "LABOR_BULK_ADDED",
          description: `${created.length} labor entries added`,
        },
      })

      return NextResponse.json({ entries: created, totalLaborCost: agg._sum.totalCost || 0 }, { status: 201 })
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Labor entry error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
