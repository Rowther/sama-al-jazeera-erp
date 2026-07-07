import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { payload: user, error } = requireAuth(_request)
    if (error) return error

    const materialRequest = await prisma.materialRequest.findUnique({
      where: { id: params.id },
      include: {
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        workOrder: { select: { id: true, workOrderId: true, customer: { select: { name: true } } } },
      },
    })

    if (!materialRequest) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ materialRequest })
  } catch (error) {
    console.error("Material request fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { payload: user, error } = requireAuth(request, ["ACCOUNTANT", "MANAGER", "OWNER"])
    if (error) return error

    const data = await request.json()

    const existing = await prisma.materialRequest.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    if (existing.status !== "PENDING") {
      return NextResponse.json({ message: "Request already processed" }, { status: 400 })
    }

    const { action, rejectedReason } = data

    const approver = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true },
    })

    if (action === "APPROVE") {
      const materialRequest = await prisma.materialRequest.update({
        where: { id: params.id },
        data: {
          status: "APPROVED",
          approvedById: user.userId,
        },
        include: {
          requestedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          workOrder: { select: { id: true, workOrderId: true } },
        },
      })

      if (existing.workOrderId && existing.items) {
        const items = existing.items as any[]
        for (const item of items) {
          let materialRecord: any = null
          let wasOutOfStock = false

          if (item.workOrderMaterialId) {
            materialRecord = await prisma.workOrderMaterial.findUnique({ where: { id: item.workOrderMaterialId } })
            if (materialRecord) wasOutOfStock = materialRecord.status === "OUT_OF_STOCK"
            await prisma.workOrderMaterial.update({
              where: { id: item.workOrderMaterialId },
              data: wasOutOfStock ? { status: "AVAILABLE" } : { status: "APPROVED" },
            })
          } else if (item.name && existing.workOrderId) {
            materialRecord = await prisma.workOrderMaterial.findFirst({
              where: {
                workOrderId: existing.workOrderId,
                materialName: { contains: item.name, mode: "insensitive" },
                status: { notIn: ["APPROVED", "REJECTED"] },
              },
              orderBy: { createdAt: "desc" },
            })
            if (materialRecord) {
              wasOutOfStock = materialRecord.status === "OUT_OF_STOCK"
              await prisma.workOrderMaterial.update({
                where: { id: materialRecord.id },
                data: wasOutOfStock ? { status: "AVAILABLE" } : { status: "APPROVED" },
              })
            }
          }

          if (materialRecord && wasOutOfStock) {
            const qty = materialRecord.requiredQuantity || item.quantity || 1
            const unit = materialRecord.unit || item.unit || "pcs"

            let inventoryItem = await prisma.inventoryItem.findFirst({
              where: { name: { contains: materialRecord.materialName, mode: "insensitive" } },
            })

            if (!inventoryItem) {
              let category = await prisma.inventoryCategory.findFirst({ where: { name: "Custom Materials" } })
              if (!category) category = await prisma.inventoryCategory.create({ data: { name: "Custom Materials" } })

              inventoryItem = await prisma.inventoryItem.create({
                data: {
                  name: materialRecord.materialName,
                  categoryId: category.id,
                  sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  unit,
                  price: (materialRecord.estimatedCost || 0) / qty,
                  stockQuantity: qty,
                },
              })
            } else {
              await prisma.inventoryItem.update({
                where: { id: inventoryItem.id },
                data: { stockQuantity: { increment: qty } },
              })
            }

            await prisma.inventoryMovement.create({
              data: {
                itemId: inventoryItem.id,
                type: "IN",
                quantity: qty,
                referenceId: existing.workOrderId,
                referenceType: "MATERIAL_REQUEST",
                notes: `Auto-added via material request approval: ${materialRecord.materialName}`,
                createdById: user.userId,
              },
            })

            await prisma.workOrderMaterial.update({
              where: { id: materialRecord.id },
              data: {
                inventoryItemId: inventoryItem.id,
                availableQuantity: qty,
                missingQuantity: 0,
              },
            })
          }
        }

        const remaining = await prisma.workOrderMaterial.findMany({
          where: { workOrderId: existing.workOrderId, status: { notIn: ["APPROVED", "REJECTED"] } },
        })
        if (remaining.length === 0) {
          const wo = await prisma.workOrder.findUnique({
            where: { id: existing.workOrderId },
            select: { status: true },
          })
          if (wo?.status === "MATERIAL_REVIEW") {
            await prisma.workOrder.update({
              where: { id: existing.workOrderId },
              data: { status: "READY_FOR_PRODUCTION" },
            })
          }
        }
      }

      await prisma.notification.create({
        data: {
          userId: existing.requestedById,
          type: "MATERIAL_REQUEST_APPROVED" as any,
          title: `Material Request ${existing.requestNumber} Approved`,
          message: `Your request "${existing.title}" has been approved by ${approver?.name || user.role}`,
          link: `/material-requests/${params.id}`,
        },
      })

      return NextResponse.json({ materialRequest })
    }

    if (action === "REJECT") {
      const materialRequest = await prisma.materialRequest.update({
        where: { id: params.id },
        data: {
          status: "REJECTED",
          approvedById: user.userId,
          rejectedReason: rejectedReason || null,
        },
        include: {
          requestedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          workOrder: { select: { id: true, workOrderId: true } },
        },
      })

      await prisma.notification.create({
        data: {
          userId: existing.requestedById,
          type: "MATERIAL_REQUEST_REJECTED" as any,
          title: `Material Request ${existing.requestNumber} Rejected`,
          message: rejectedReason
            ? `Your request "${existing.title}" was rejected: ${rejectedReason}`
            : `Your request "${existing.title}" has been rejected by ${approver?.name || user.role}`,
          link: `/material-requests/${params.id}`,
        },
      })

      return NextResponse.json({ materialRequest })
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Material request update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
