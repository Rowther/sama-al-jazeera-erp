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

    const allInventory = await prisma.inventoryItem.findMany({ include: { category: true } })

    const enriched = materials.map(mat => {
      let matchingItems: any[] = []
      const seen = new Set<string>()

      if (mat.inventoryItemId) {
        const directItem = allInventory.find(i => i.id === mat.inventoryItemId)
        if (directItem) { matchingItems.push(directItem); seen.add(directItem.id) }
      } else {
        const normalizedName = mat.materialName.toLowerCase().trim()

        const skuMatches = allInventory.filter(item => {
          if (seen.has(item.id)) return false
          const itemSku = item.sku?.toLowerCase().trim()
          return itemSku === normalizedName || itemSku?.includes(normalizedName) || normalizedName.includes(itemSku || "")
        })
        for (const item of skuMatches) { matchingItems.push(item); seen.add(item.id) }

        if (skuMatches.length === 0) {
          const nameWords = normalizedName.split(/\s+/).filter((w: string) => w.length > 1)
          const nameMatches = allInventory.filter(item => {
            if (seen.has(item.id)) return false
            const itemName = item.name.toLowerCase().trim()
            const itemWords = itemName.split(/\s+/).filter((w: string) => w.length > 1)
            if (itemName === normalizedName) return true
            if (itemName.includes(normalizedName) || normalizedName.includes(itemName)) return true
            const sharedWords = nameWords.filter((w: string) => itemWords.includes(w))
            const matchRatio = sharedWords.length / Math.max(nameWords.length, itemWords.length)
            if (matchRatio >= 0.5 && sharedWords.length >= 2) return true
            if (mat.category && item.category?.name?.toLowerCase() === mat.category.toLowerCase()) {
              const catShared = nameWords.filter((w: string) => itemWords.includes(w))
              return catShared.length >= 2
            }
            return false
          })
          for (const item of nameMatches) { matchingItems.push(item); seen.add(item.id) }
        }
      }

      const totalAvailable = matchingItems.reduce((sum, item) => sum + item.stockQuantity, 0)
      const requiredQty = mat.requiredQuantity
      let status: string
      let availableQty = 0
      let missingQty = 0

      if (totalAvailable >= requiredQty) {
        status = "AVAILABLE"; availableQty = requiredQty; missingQty = 0
      } else if (totalAvailable > 0) {
        status = "PARTIALLY_AVAILABLE"; availableQty = totalAvailable; missingQty = requiredQty - totalAvailable
      } else {
        status = "OUT_OF_STOCK"; availableQty = 0; missingQty = requiredQty
      }

      return { ...mat, computedStatus: status, computedAvailableQuantity: availableQty, computedMissingQuantity: missingQty, totalStockQuantity: totalAvailable, inventoryMatches: matchingItems.map(i => ({ id: i.id, name: i.name, stock: i.stockQuantity, unit: i.unit })) }
    })

    return NextResponse.json({ materials: enriched })
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
          inventoryItemId: mat.inventoryItemId || undefined,
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

async function deductInventoryForMaterial(tx: any, material: any, userId: string) {
  const allInventory = await tx.inventoryItem.findMany({
    include: { category: true },
  })

  let matchingItems: any[] = []
  const seen = new Set<string>()

  if (material.inventoryItemId) {
    // User explicitly chose an inventory item — ONLY use that one, no fuzzy matching
    const directItem = allInventory.find((i: any) => i.id === material.inventoryItemId)
    if (directItem) {
      matchingItems.push(directItem)
      seen.add(directItem.id)
    }
  } else {
    // No direct link — try SKU / name matching to find the best candidate
    const normalizedName = material.materialName.toLowerCase().trim()

    const skuMatches = allInventory.filter((item: any) => {
      if (seen.has(item.id)) return false
      const itemSku = item.sku?.toLowerCase().trim()
      return itemSku === normalizedName || itemSku?.includes(normalizedName) || normalizedName.includes(itemSku || "")
    })
    for (const item of skuMatches) {
      matchingItems.push(item)
      seen.add(item.id)
    }

    if (skuMatches.length === 0) {
      const nameWords = normalizedName.split(/\s+/).filter((w: string) => w.length > 1)

      const nameMatches = allInventory.filter((item: any) => {
        if (seen.has(item.id)) return false
        const itemName = item.name.toLowerCase().trim()
        const itemWords = itemName.split(/\s+/).filter((w: string) => w.length > 1)

        if (itemName === normalizedName) return true
        if (itemName.includes(normalizedName) || normalizedName.includes(itemName)) return true

        const sharedWords = nameWords.filter((w: string) => itemWords.includes(w))
        const matchRatio = sharedWords.length / Math.max(nameWords.length, itemWords.length)
        if (matchRatio >= 0.5 && sharedWords.length >= 2) return true
        if (material.category && item.category?.name?.toLowerCase() === material.category.toLowerCase()) {
          const catShared = nameWords.filter((w: string) => itemWords.includes(w))
          return catShared.length >= 2
        }
        return false
      })
      for (const item of nameMatches) {
        matchingItems.push(item)
        seen.add(item.id)
      }
    }
  }

  let remaining = material.requiredQuantity
  for (const item of matchingItems) {
    if (remaining <= 0) break
    const deductQty = Math.min(item.stockQuantity, remaining)
    if (deductQty <= 0) continue

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { stockQuantity: { decrement: deductQty } },
    })

    await tx.inventoryMovement.create({
      data: {
        itemId: item.id,
        type: "OUT",
        quantity: deductQty,
        referenceId: material.workOrderId,
        referenceType: "WORK_ORDER",
        notes: `Deducted for approved material: ${material.materialName}`,
        createdById: userId,
      },
    })

    await tx.workOrderInventory.create({
      data: {
        workOrderId: material.workOrderId,
        workOrderItemId: material.workOrderItemId || undefined,
        itemId: item.id,
        quantityAllocated: deductQty,
        quantityUsed: deductQty,
      },
    })

    remaining -= deductQty
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
      const result = await prisma.$transaction(async (tx) => {
        const pendingMaterials = await tx.workOrderMaterial.findMany({
          where: { workOrderId: params.id, status: { notIn: ["APPROVED", "REJECTED"] } },
        })

        const updated = await tx.workOrderMaterial.updateMany({
          where: { workOrderId: params.id, status: { notIn: ["APPROVED", "REJECTED"] } },
          data: { status: "APPROVED" },
        })

        for (const mat of pendingMaterials) {
          let expenseAmount = mat.estimatedCost || mat.actualCost || 0
          if (mat.inventoryItemId) {
            const invItem = await tx.inventoryItem.findUnique({
              where: { id: mat.inventoryItemId },
              select: { price: true },
            })
            if (invItem && invItem.price > 0) {
              expenseAmount = invItem.price * mat.requiredQuantity
            }
          }

          await tx.expense.create({
            data: {
              workOrderId: params.id,
              category: "MATERIAL",
              amount: expenseAmount,
              description: `Material: ${mat.materialName}${mat.category ? ` (${mat.category})` : ""}`,
              approvedById: user.userId,
            },
          })

          await deductInventoryForMaterial(tx, mat, user.userId)
        }

        const totalExpenses = await tx.expense.aggregate({
          where: { workOrderId: params.id },
          _sum: { amount: true },
        })
        await tx.workOrder.update({
          where: { id: params.id },
          data: { totalCost: totalExpenses._sum.amount || 0 },
        })

        await tx.activityHistory.create({
          data: {
            workOrderId: params.id, userId: user.userId, action: "MATERIALS_APPROVED",
            description: `All materials approved by ${currentUser.name}. ${pendingMaterials.length} material(s) deducted from inventory.`,
          },
        })

        const workOrder = await tx.workOrder.findUnique({
          where: { id: params.id },
          select: { status: true },
        })
        if (workOrder?.status === "MATERIAL_REVIEW") {
          await tx.workOrder.update({
            where: { id: params.id },
            data: { status: "READY_FOR_PRODUCTION" },
          })
          await tx.activityHistory.create({
            data: {
              workOrderId: params.id, userId: user.userId, action: "STATUS_CHANGED",
              description: `Work order moved to Ready For Production after material approval by ${currentUser.name}`,
            },
          })
        }

        return { count: updated.count }
      })

      return NextResponse.json(result)
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

    if (action === "delete" && materialId) {
      const material = await prisma.workOrderMaterial.findUnique({ where: { id: materialId } })
      if (!material) return NextResponse.json({ message: "Material not found" }, { status: 404 })

      await prisma.workOrderMaterial.delete({ where: { id: materialId } })

      await prisma.activityHistory.create({
        data: {
          workOrderId: params.id, userId: user.userId, action: "MATERIAL_DELETED",
          description: `Material "${material.materialName}" deleted by ${currentUser.name}`,
        },
      })

      return NextResponse.json({ message: "Deleted" })
    }

    if (materialId && (status === "APPROVED" || status === "REJECTED")) {
      const result = await prisma.$transaction(async (tx) => {
        const material = await tx.workOrderMaterial.update({
          where: { id: materialId },
          data: { status: status as any },
        })

        const actionLabel = status === "APPROVED" ? "MATERIAL_APPROVED" : "MATERIAL_REJECTED"
        await tx.activityHistory.create({
          data: {
            workOrderId: params.id, userId: user.userId,
            action: actionLabel,
            description: `Material "${material.materialName}" ${status.toLowerCase()} by ${currentUser.name}`,
          },
        })

        if (status === "APPROVED") {
          let expenseAmount = material.estimatedCost || material.actualCost || 0
          if (material.inventoryItemId) {
            const invItem = await tx.inventoryItem.findUnique({
              where: { id: material.inventoryItemId },
              select: { price: true },
            })
            if (invItem && invItem.price > 0) {
              expenseAmount = invItem.price * material.requiredQuantity
            }
          }

          await tx.expense.create({
            data: {
              workOrderId: params.id,
              category: "MATERIAL",
              amount: expenseAmount,
              description: `Material: ${material.materialName}${material.category ? ` (${material.category})` : ""}`,
              approvedById: user.userId,
            },
          })

          const totalExpenses = await tx.expense.aggregate({
            where: { workOrderId: params.id },
            _sum: { amount: true },
          })
          await tx.workOrder.update({
            where: { id: params.id },
            data: { totalCost: totalExpenses._sum.amount || 0 },
          })

          await deductInventoryForMaterial(tx, material, user.userId)

          const remaining = await tx.workOrderMaterial.findMany({
            where: { workOrderId: params.id, status: { notIn: ["APPROVED", "REJECTED"] } },
          })
          if (remaining.length === 0) {
            const workOrder = await tx.workOrder.findUnique({
              where: { id: params.id },
              select: { status: true },
            })
            if (workOrder?.status === "MATERIAL_REVIEW") {
              await tx.workOrder.update({
                where: { id: params.id },
                data: { status: "READY_FOR_PRODUCTION" },
              })
              await tx.activityHistory.create({
                data: {
                  workOrderId: params.id, userId: user.userId, action: "STATUS_CHANGED",
                  description: `Work order moved to Ready For Production after all materials approved by ${currentUser.name}`,
                },
              })
            }
          }
        }

        return { material }
      })

      return NextResponse.json(result)
    }

    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("Materials update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
