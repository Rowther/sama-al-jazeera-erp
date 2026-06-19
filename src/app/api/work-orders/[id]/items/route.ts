import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const items = await prisma.workOrderItem.findMany({
      where: { workOrderId: params.id },
      include: {
        workerAssignments: { include: { user: { select: { id: true, name: true, role: true } } } },
        productionStages: {
          include: {
            assignedTo: { select: { id: true, name: true, role: true } },
            laborEntries: { include: { worker: { select: { id: true, name: true, role: true } } } },
          },
          orderBy: { sortOrder: "asc" },
        },
        materials: true,
        laborEntries: { include: { worker: { select: { id: true, name: true, role: true } } } },
        expenses: true,
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Work order items fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER"])
    if (error) return error

    const data = await request.json()
    const itemsData = Array.isArray(data) ? data : [data]

    const created = []
    for (const item of itemsData) {
      const workOrderItem = await prisma.workOrderItem.create({
        data: {
          workOrderId: params.id,
          name: item.name,
          description: item.description || null,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null,
          totalPrice: item.totalPrice ? parseFloat(item.totalPrice) : null,
          image: item.image || null,
          dimensions: item.dimensions || null,
          notes: item.notes || null,
          estimatedCost: item.estimatedCost ? parseFloat(item.estimatedCost) : null,
        },
      })
      created.push(workOrderItem)
    }

    await prisma.activityHistory.create({
      data: {
        workOrderId: params.id,
        userId: user.userId,
        action: "ITEMS_ADDED",
        description: `${created.length} item(s) added to work order`,
      },
    })

    return NextResponse.json({ items: created }, { status: 201 })
  } catch (error) {
    console.error("Work order items create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER"])
    if (error) return error

    const data = await request.json()
    const { itemId, ...updateData } = data

    if (!itemId) {
      return NextResponse.json({ message: "itemId is required" }, { status: 400 })
    }

    const allowedFields = ["name", "description", "quantity", "unitPrice", "totalPrice", "image", "dimensions", "notes", "status", "progress", "deliveryStatus", "estimatedCost"]
    const cleanData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) cleanData[key] = updateData[key]
    }
    if (cleanData.estimatedCost !== undefined) cleanData.estimatedCost = parseFloat(cleanData.estimatedCost as string)

    const item = await prisma.workOrderItem.update({
      where: { id: itemId },
      data: cleanData,
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error("Work order item update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER"])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get("itemId")

    if (!itemId) {
      return NextResponse.json({ message: "itemId query param required" }, { status: 400 })
    }

    await prisma.workOrderItem.delete({ where: { id: itemId } })

    await prisma.activityHistory.create({
      data: {
        workOrderId: params.id,
        userId: user.userId,
        action: "ITEM_REMOVED",
        description: `Item removed from work order`,
      },
    })

    return NextResponse.json({ message: "Item deleted" })
  } catch (error) {
    console.error("Work order item delete error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
