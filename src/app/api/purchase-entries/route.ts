import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const { searchParams } = new URL(request.url)
    const workOrderId = searchParams.get("workOrderId")
    const accountantView = searchParams.get("accountantView")

    const where: Record<string, unknown> = {}
    if (workOrderId) where.workOrderId = workOrderId
    if (accountantView === "true") {
      where.paymentStatus = "PENDING"
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50")), 200)
    const skip = (page - 1) * limit

    const [entries, total] = await Promise.all([
      prisma.purchaseEntry.findMany({
        where,
        include: {
          workOrder: { select: { workOrderId: true, id: true } },
          supplier: true,
          createdBy: { select: { id: true, name: true } },
          items: true,
          documents: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.purchaseEntry.count({ where }),
    ])

    return NextResponse.json({ purchaseEntries: entries, total, page, totalPages: Math.ceil(total / limit) }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
    })
  } catch (error) {
    console.error("Purchase entries fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "INVENTORY_MANAGER"])
    if (error) return error

    const data = await request.json()

    if (!data.workOrderId || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ message: "Work order ID and items are required" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      let totalCost = 0
      const itemData = data.items.map((item: { quantity: string; unitPrice: string; materialName: string; workOrderMaterialId?: string }) => {
        const quantity = parseFloat(item.quantity) || 0
        const unitPrice = parseFloat(item.unitPrice) || 0
        const totalPrice = quantity * unitPrice
        totalCost += totalPrice
        return {
          workOrderMaterialId: item.workOrderMaterialId || null,
          materialName: item.materialName || "Unknown",
          quantity,
          unitPrice,
          totalPrice,
        }
      })

      const entry = await tx.purchaseEntry.create({
        data: {
          workOrderId: data.workOrderId,
          supplierId: data.supplierId || null,
          supplierName: data.supplierName || null,
          supplierContact: data.supplierContact || null,
          purchaseType: data.purchaseType || "CASH",
          invoiceNumber: data.invoiceNumber || null,
          billNumber: data.billNumber || null,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
          totalCost,
          notes: data.notes || null,
          createdById: user.userId,
          items: { create: itemData },
        },
        include: { items: true, documents: true, supplier: true },
      })

      for (const item of itemData) {
        if (item.workOrderMaterialId && item.workOrderMaterialId !== "") {
          await tx.workOrderMaterial.update({
            where: { id: item.workOrderMaterialId },
            data: {
              status: "ORDERED",
              actualCost: { increment: item.totalPrice },
            },
          })
        }
      }

      const workOrder = await tx.workOrder.findUnique({
        where: { id: data.workOrderId },
        select: { workOrderId: true },
      })

      const accountants = await tx.user.findMany({
        where: { role: "ACCOUNTANT", isActive: true },
      })

      if (accountants.length > 0) {
        await tx.notification.createMany({
          data: accountants.map((acc) => ({
            userId: acc.id,
            type: "MATERIAL_COST_APPROVAL",
            title: "Material Purchase Pending Approval",
            message: `Purchase for WO ${workOrder?.workOrderId || data.workOrderId} needs cost approval (${totalCost} AED)`,
            link: `/dashboard/accountant/material-approvals`,
          })),
        })
      }

      await tx.activityHistory.create({
        data: {
          workOrderId: data.workOrderId,
          userId: user.userId,
          action: "PURCHASE_CREATED",
          description: `Purchase entry created with ${itemData.length} items, total ${totalCost}`,
          metadata: { entryId: entry.id, totalCost, itemCount: itemData.length },
        },
      })

      return entry
    })

    return NextResponse.json({ purchaseEntry: result }, { status: 201 })
  } catch (error) {
    console.error("Purchase entry create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}