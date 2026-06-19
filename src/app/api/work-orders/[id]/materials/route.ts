import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest, requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const workOrderItemId = searchParams.get("workOrderItemId")
    const where: Record<string, unknown> = { workOrderId: params.id }
    if (workOrderItemId) where.workOrderItemId = workOrderItemId

    const materials = await prisma.workOrderMaterial.findMany({
      where,
      include: { purchaseEntryItems: true },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ materials })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const data = await request.json()
    const materials = data.materials || [data]

    const created = []
    for (const mat of materials) {
      const material = await prisma.workOrderMaterial.create({
        data: {
          workOrderId: params.id,
          workOrderItemId: mat.workOrderItemId || undefined,
          materialName: mat.materialName,
          category: mat.category,
          requiredQuantity: parseFloat(mat.requiredQuantity) || 0,
          unit: mat.unit || "pcs",
          estimatedCost: parseFloat(mat.estimatedCost) || 0,
          supplierPreference: mat.supplierPreference,
          priority: mat.priority || "MEDIUM",
          notes: mat.notes,
          status: "PENDING",
        },
      })
      created.push(material)
    }

    await prisma.activityHistory.create({
      data: {
        workOrderId: params.id,
        userId: user.userId,
        action: "MATERIALS_ADDED",
        description: `${created.length} material(s) added to work order`,
        metadata: { count: created.length },
      },
    })

    return NextResponse.json({ materials: created }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "ACCOUNTANT", "INVENTORY_MANAGER"])
    if (error) return error

    const currentUser = await prisma.user.findUnique({ where: { id: user.userId } })
    if (!currentUser) return NextResponse.json({ message: "User not found" }, { status: 404 })

    const data = await request.json()
    const { materialId, status, action, updates } = data

    if (action === "approve_all") {
      const updated = await prisma.workOrderMaterial.updateMany({
        where: { workOrderId: params.id, status: { notIn: ["APPROVED", "REJECTED"] } },
        data: { status: "APPROVED" },
      })

      const approvedMaterials = await prisma.workOrderMaterial.findMany({
        where: { workOrderId: params.id, status: "APPROVED" },
      })

      for (const mat of approvedMaterials) {
        const expenseAmount = mat.estimatedCost || mat.actualCost || 0
        if (expenseAmount > 0) {
          await prisma.expense.create({
            data: {
              workOrderId: params.id,
              category: "MATERIAL",
              amount: expenseAmount,
              description: `Material: ${mat.materialName}${mat.category ? ` (${mat.category})` : ""}`,
              approvedById: user.userId,
            },
          })
        }
      }

      const totalExpenses = await prisma.expense.aggregate({
        where: { workOrderId: params.id },
        _sum: { amount: true },
      })
      await prisma.workOrder.update({
        where: { id: params.id },
        data: { totalCost: totalExpenses._sum.amount || 0 },
      })

      await prisma.activityHistory.create({
        data: {
          workOrderId: params.id, userId: user.userId, action: "MATERIALS_APPROVED",
          description: `All materials approved by ${currentUser.name}. ${approvedMaterials.length} expense(s) recorded.`,
        },
      })

      const workOrder = await prisma.workOrder.findUnique({
        where: { id: params.id },
        select: { status: true },
      })
      if (workOrder?.status === "MATERIAL_REVIEW") {
        await prisma.workOrder.update({
          where: { id: params.id },
          data: { status: "READY_FOR_PRODUCTION" },
        })
        await prisma.activityHistory.create({
          data: {
            workOrderId: params.id, userId: user.userId, action: "STATUS_CHANGED",
            description: `Work order moved to Ready For Production after material approval by ${currentUser.name}`,
          },
        })
      }

      return NextResponse.json({ count: updated.count })
    }

    if (action === "reject_all") {
      const updated = await prisma.workOrderMaterial.updateMany({
        where: { workOrderId: params.id, status: { notIn: ["APPROVED", "REJECTED"] } },
        data: { status: "REJECTED" },
      })

      await prisma.activityHistory.create({
        data: {
          workOrderId: params.id, userId: user.userId, action: "MATERIALS_REJECTED",
          description: `All materials rejected by ${currentUser.name}`,
        },
      })

      return NextResponse.json({ count: updated.count })
    }

    if (action === "edit" && materialId) {
      const material = await prisma.workOrderMaterial.update({
        where: { id: materialId },
        data: {
          ...(updates.materialName !== undefined && { materialName: updates.materialName }),
          ...(updates.category !== undefined && { category: updates.category }),
          ...(updates.requiredQuantity !== undefined && { requiredQuantity: parseFloat(updates.requiredQuantity) }),
          ...(updates.unit !== undefined && { unit: updates.unit }),
          ...(updates.estimatedCost !== undefined && { estimatedCost: parseFloat(updates.estimatedCost) }),
          ...(updates.supplierPreference !== undefined && { supplierPreference: updates.supplierPreference }),
          ...(updates.priority !== undefined && { priority: updates.priority }),
          ...(updates.notes !== undefined && { notes: updates.notes }),
          ...(updates.workOrderItemId !== undefined && { workOrderItemId: updates.workOrderItemId }),
        },
      })

      await prisma.activityHistory.create({
        data: {
          workOrderId: params.id, userId: user.userId, action: "MATERIAL_UPDATED",
          description: `Material "${material.materialName}" updated by ${currentUser.name}`,
        },
      })

      return NextResponse.json({ material })
    }

    if (materialId && (status === "APPROVED" || status === "REJECTED")) {
      const material = await prisma.workOrderMaterial.update({
        where: { id: materialId },
        data: { status: status as any },
      })

      const actionLabel = status === "APPROVED" ? "MATERIAL_APPROVED" : "MATERIAL_REJECTED"
      await prisma.activityHistory.create({
        data: {
          workOrderId: params.id, userId: user.userId,
          action: actionLabel,
          description: `Material "${material.materialName}" ${status.toLowerCase()} by ${currentUser.name}`,
        },
      })

      if (status === "APPROVED") {
        const expenseAmount = material.estimatedCost || material.actualCost || 0
        if (expenseAmount > 0) {
          await prisma.expense.create({
            data: {
              workOrderId: params.id,
              category: "MATERIAL",
              amount: expenseAmount,
              description: `Material: ${material.materialName}${material.category ? ` (${material.category})` : ""}`,
              approvedById: user.userId,
            },
          })

          const totalExpenses = await prisma.expense.aggregate({
            where: { workOrderId: params.id },
            _sum: { amount: true },
          })
          await prisma.workOrder.update({
            where: { id: params.id },
            data: { totalCost: totalExpenses._sum.amount || 0 },
          })
        }

        const remaining = await prisma.workOrderMaterial.findMany({
          where: { workOrderId: params.id, status: { notIn: ["APPROVED", "REJECTED"] } },
        })
        if (remaining.length === 0) {
          const workOrder = await prisma.workOrder.findUnique({
            where: { id: params.id },
            select: { status: true },
          })
          if (workOrder?.status === "MATERIAL_REVIEW") {
            await prisma.workOrder.update({
              where: { id: params.id },
              data: { status: "READY_FOR_PRODUCTION" },
            })
            await prisma.activityHistory.create({
              data: {
                workOrderId: params.id, userId: user.userId, action: "STATUS_CHANGED",
                description: `Work order moved to Ready For Production after all materials approved by ${currentUser.name}`,
              },
            })
          }
        }
      }

      return NextResponse.json({ material })
    }

    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("Materials update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
