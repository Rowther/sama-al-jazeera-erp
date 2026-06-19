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

    const workers = await prisma.workerAssignment.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { assignedDate: "desc" },
    })

    return NextResponse.json({ workers })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "PRODUCTION_MANAGER"])
    if (error) return error

    const data = await request.json()
    const workers = Array.isArray(data) ? data : [data]

    const created = []
    for (const w of workers) {
      const assignment = await prisma.workerAssignment.upsert({
        where: {
          workOrderId_userId: { workOrderId: params.id, userId: w.userId },
        },
        update: {
          role: w.role || "CARPENTER",
          progress: w.progress || 0,
          notes: w.notes || null,
          ...(w.workOrderItemId && { workOrderItemId: w.workOrderItemId }),
        },
        create: {
          workOrderId: params.id,
          userId: w.userId,
          role: w.role || "CARPENTER",
          progress: w.progress || 0,
          notes: w.notes || null,
          workOrderItemId: w.workOrderItemId || undefined,
        },
        include: { user: { select: { id: true, name: true, role: true } } },
      })
      created.push(assignment)
    }

    await prisma.activityHistory.create({
      data: {
        workOrderId: params.id,
        userId: user.userId,
        action: "WORKERS_ASSIGNED",
        description: `${created.length} worker(s) assigned to work order`,
      },
    })

    return NextResponse.json({ workers: created }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "PRODUCTION_MANAGER"])
    if (error) return error

    const data = await request.json()
    const { workerId, progress, notes, workOrderItemId } = data

    if (!workerId) {
      return NextResponse.json({ message: "workerId is required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (progress !== undefined) updateData.progress = progress
    if (notes !== undefined) updateData.notes = notes
    if (workOrderItemId !== undefined) updateData.workOrderItemId = workOrderItemId

    const worker = await prisma.workerAssignment.update({
      where: { id: workerId },
      data: updateData,
      include: { user: { select: { id: true, name: true, role: true } } },
    })

    return NextResponse.json({ worker })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
