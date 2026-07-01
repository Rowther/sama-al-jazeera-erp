import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const workOrderId = searchParams.get("workOrderId")

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (workOrderId) where.workOrderId = workOrderId

    const requests = await prisma.materialRequest.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        workOrder: { select: { id: true, workOrderId: true, customer: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error("Material requests fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["INVENTORY_MANAGER", "OWNER", "MANAGER"])
    if (error) return error

    const data = await request.json()

    if (!data.title || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ message: "Title and at least one item are required" }, { status: 400 })
    }

    const count = await prisma.materialRequest.count()
    const requestNumber = `MR-${String(count + 1).padStart(4, "0")}`

    const materialRequest = await prisma.materialRequest.create({
      data: {
        requestNumber,
        title: data.title,
        description: data.description || null,
        workOrderId: data.workOrderId || null,
        items: data.items,
        status: "PENDING",
        requestedById: user.userId,
      },
      include: {
        requestedBy: { select: { id: true, name: true } },
        workOrder: { select: { id: true, workOrderId: true, customer: { select: { name: true } } } },
      },
    })

    const approvers = await prisma.user.findMany({
      where: { role: { in: ["ACCOUNTANT", "MANAGER"] }, isActive: true },
      select: { id: true },
    })

    await prisma.notification.createMany({
      data: approvers.map((a) => ({
        userId: a.id,
        type: "MATERIAL_REQUEST_CREATED" as any,
        title: `Material Request ${requestNumber}`,
        message: data.title,
        link: `/material-requests/${materialRequest.id}`,
      })),
    })

    return NextResponse.json({ materialRequest }, { status: 201 })
  } catch (error) {
    console.error("Material request create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
