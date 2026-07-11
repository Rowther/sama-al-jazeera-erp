import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest, requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const assignedTo = searchParams.get("assignedTo")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (assignedTo) where.assignedToId = assignedTo
    if (search) {
      where.OR = [
        { workOrderId: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ]
    }
    if (user.role === "DESIGNER") where.assignedToId = user.userId

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50")), 200)
    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: {
          customer: true,
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { designs: true, expenses: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.workOrder.count({ where }),
    ])

    return NextResponse.json({
      workOrders: orders, total, page,
      totalPages: Math.ceil(total / limit),
    }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
    })
  } catch (error) {
    console.error("Work orders fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "DESIGNER"])
    if (error) return error

    const data = await request.json()

    if (!data.projectType) {
      return NextResponse.json({ message: "Project type is required" }, { status: 400 })
    }

    const count = await prisma.workOrder.count()
    const workOrderId = `WO-${String(count + 1).padStart(4, "0")}`

    const result = await prisma.$transaction(async (tx) => {
      let customer = data.customerId
        ? await tx.customer.findUnique({ where: { id: data.customerId } })
        : null

      if (!customer && data.customerName) {
        customer = await tx.customer.create({
          data: { name: data.customerName, phone: data.customerPhone || "", location: data.customerLocation || "" },
        })
      }

      if (!customer) {
        throw new Error("Customer required")
      }

      const order = await tx.workOrder.create({
        data: {
          workOrderId,
          customerId: customer.id,
          projectType: data.projectType,
          furnitureType: data.furnitureType,
          description: data.description,
          priority: data.priority || "MEDIUM",
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          dimensions: data.dimensions,
          items: data.items || [],
          companyName: data.companyName || null,
          companyContact: data.companyContact || null,
          estimateRef: data.estimateRef || null,
          notes: data.notes,
          estimatedBudget: data.estimatedBudget ? parseFloat(data.estimatedBudget) : null,
          advanceReceived: data.advanceReceived ? parseFloat(data.advanceReceived) : 0,
          paymentTerms: data.paymentTerms,
          status: data.status || "DRAFT",
          assignedToId: data.assignedToId || null,
          createdById: user.userId,
        },
        include: {
          customer: true,
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      })

      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        await tx.workOrderItem.createMany({
          data: data.items.map((item: {
            name: string; quantity?: number; unitPrice?: number; totalPrice?: number;
            image?: string; description?: string; dimensions?: string; notes?: string; estimatedCost?: number
          }) => ({
            workOrderId: order.id,
            name: item.name,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
            totalPrice: item.totalPrice ? Number(item.totalPrice) : null,
            image: item.image || null,
            description: item.description || null,
            dimensions: item.dimensions || null,
            notes: item.notes || null,
            estimatedCost: item.estimatedCost ? Number(item.estimatedCost) : null,
          })),
        })
      }

      if (data.assignedToId) {
        await tx.notification.create({
          data: {
            userId: data.assignedToId,
            type: "WORK_ORDER_ASSIGNED",
            title: "New Work Order Assignment",
            message: `Work order ${workOrderId} has been assigned to you`,
            link: `/work-orders/${order.id}`,
          },
        })
      }

      await tx.activityHistory.create({
        data: {
          workOrderId: order.id, userId: user.userId, action: "CREATED",
          description: `Work order ${workOrderId} created`,
        },
      })

      const existingJobCard = await tx.jobCard.findUnique({ where: { workOrderId: order.id } })
      if (!existingJobCard) {
        await tx.jobCard.create({
          data: { workOrderId: order.id, generatedById: user.userId },
        })
      }

      return order
    })

    return NextResponse.json({ workOrder: result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Customer required") {
      return NextResponse.json({ message }, { status: 400 })
    }
    console.error("Work order create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}