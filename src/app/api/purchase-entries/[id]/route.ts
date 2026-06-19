import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const entry = await prisma.purchaseEntry.findUnique({
      where: { id: params.id },
      include: {
        workOrder: { select: { workOrderId: true, id: true } },
        supplier: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { workOrderMaterial: true } },
        documents: true,
      },
    })

    if (!entry) return NextResponse.json({ message: "Purchase entry not found" }, { status: 404 })

    return NextResponse.json({ purchaseEntry: entry })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const data = await request.json()
    const allowedFields = ["paymentStatus", "notes", "invoiceNumber", "billNumber"]
    const updateData: any = {}

    for (const key of allowedFields) {
      if (data[key] !== undefined) updateData[key] = data[key]
    }

    const entry = await prisma.purchaseEntry.update({
      where: { id: params.id },
      data: updateData,
      include: {
        workOrder: { select: { workOrderId: true, id: true } },
        items: true,
      },
    })

    if (data.paymentStatus === "PAID") {
      for (const item of entry.items || []) {
        await prisma.workOrderMaterial.updateMany({
          where: { id: item.workOrderMaterialId || "" },
          data: { status: "RECEIVED" },
        })
      }

      await prisma.purchaseEntry.update({
        where: { id: params.id },
        data: { paymentStatus: "PAID" },
      })
    }

    const woId = entry.workOrderId
    const materials = await prisma.workOrderMaterial.findMany({
      where: { workOrderId: woId },
    })

    const totalMaterialCost = materials.reduce((sum, m) => sum + m.actualCost, 0)
    const estimatedMaterialCost = materials.reduce((sum, m) => sum + m.estimatedCost, 0)

    await prisma.activityHistory.create({
      data: {
        workOrderId: woId,
        userId: user.userId,
        action: "PURCHASE_UPDATED",
        description: `Purchase entry ${params.id} updated: payment status set to ${data.paymentStatus}`,
      },
    })

    return NextResponse.json({ purchaseEntry: entry, totalMaterialCost, estimatedMaterialCost })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
