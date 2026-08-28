import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest, requireAuth } from "@/lib/auth"
import { Prisma } from "@prisma/client"

type TxClient = Prisma.TransactionClient

interface MaterialLike {
  materialName: string
  category?: string | null
  estimatedCost?: number
  requiredQuantity?: number
  actualCost?: number
  inventoryItemId?: string | null
  inventoryMatches?: { id: string; price: number }[]
  status?: string
}

function materialExpenseDescription(material: { materialName: string; category?: string | null }) {
  return `Material: ${material.materialName}${material.category ? ` (${material.category})` : ""}`
}

async function resolveMaterialAmount(tx: TxClient, material: MaterialLike): Promise<number> {
  const estimatedTotal = (material.estimatedCost || 0) * (material.requiredQuantity || 0)
  if (estimatedTotal > 0) return estimatedTotal
  if ((material.actualCost || 0) > 0) return material.actualCost || 0

  if (material.inventoryItemId) {
    const invItem = await tx.inventoryItem.findUnique({
      where: { id: material.inventoryItemId },
      select: { price: true },
    })
    if (invItem && invItem.price > 0) {
      return invItem.price * (material.requiredQuantity || 1)
    }
  }
  return 0
}

async function reconcileMaterialExpenses(tx: TxClient, workOrderId: string, materials: MaterialLike[], userId?: string) {
  const existingExpenses = await tx.expense.findMany({
    where: { workOrderId, category: "MATERIAL" },
    orderBy: { createdAt: "asc" },
  })

  const approved = materials.filter((m) => m.status === "APPROVED")
  const pool = [...existingExpenses]

  for (const mat of approved) {
    const desc = materialExpenseDescription(mat)
    const amount = await resolveMaterialAmount(tx, mat)

    const idx = pool.findIndex((e) => e.description === desc)
    if (idx >= 0) {
      const slot = pool[idx]
      pool.splice(idx, 1)

      if (amount <= 0) {
        await tx.expense.delete({ where: { id: slot.id } })
      } else if (Math.abs(slot.amount - amount) > 0.01) {
        await tx.expense.update({ where: { id: slot.id }, data: { amount } })
      }
    } else if (amount > 0) {
      await tx.expense.create({
        data: { workOrderId, category: "MATERIAL", amount, description: desc, approvedById: userId || undefined },
      })
    }
  }

  const staleIds = pool.map((e) => e.id)
  if (staleIds.length > 0) {
    await tx.expense.deleteMany({ where: { id: { in: staleIds } } })
  }
}

async function syncMaterialExpensesToCost(tx: TxClient, workOrderId: string, userId?: string) {
  const materials = await tx.workOrderMaterial.findMany({ where: { workOrderId } })
  await reconcileMaterialExpenses(tx, workOrderId, materials, userId)

  const total = await tx.expense.aggregate({
    where: { workOrderId },
    _sum: { amount: true },
  })
  await tx.workOrder.update({
    where: { id: workOrderId },
    data: { totalCost: total._sum.amount || 0 },
  })
}

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

      let computedEstimatedCost = mat.estimatedCost
      if ((!computedEstimatedCost || computedEstimatedCost === 0) && matchingItems.length > 0) {
        const priceItem = matchingItems.find((i: any) => i.price > 0)
        if (priceItem) {
          computedEstimatedCost = priceItem.price
        }
      }

      return { ...mat, estimatedCost: computedEstimatedCost || mat.estimatedCost, computedStatus: status, computedAvailableQuantity: availableQty, computedMissingQuantity: missingQty, totalStockQuantity: totalAvailable, inventoryMatches: matchingItems.map(i => ({ id: i.id, name: i.name, stock: i.stockQuantity, unit: i.unit, price: i.price })) }
    })

    for (const mat of enriched) {
      if (mat.estimatedCost && mat.estimatedCost > 0 && materials.find(m => m.id === mat.id)?.estimatedCost === 0) {
        await prisma.workOrderMaterial.update({
          where: { id: mat.id },
          data: { estimatedCost: mat.estimatedCost },
        })
      }
    }

    await prisma.$transaction(async (tx) => {
      await reconcileMaterialExpenses(tx, params.id, enriched)
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
          await deductInventoryForMaterial(tx, mat, user.userId)
        }

        await syncMaterialExpensesToCost(tx, params.id, user.userId)

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
      const material = await prisma.$transaction(async (tx) => {
        const updated = await tx.workOrderMaterial.update({
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

        await syncMaterialExpensesToCost(tx, params.id, user.userId)

        await tx.activityHistory.create({
          data: {
            workOrderId: params.id, userId: user.userId, action: "MATERIAL_UPDATED",
            description: `Material "${updated.materialName}" updated by ${currentUser.name}`,
            metadata: { materialId },
          },
        })

        return updated
      })

      return NextResponse.json({ material })
    }

    if (action === "delete" && materialId) {
      const material = await prisma.workOrderMaterial.findUnique({ where: { id: materialId } })
      if (!material) return NextResponse.json({ message: "Material not found" }, { status: 404 })

      await prisma.$transaction(async (tx) => {
        await tx.workOrderMaterial.delete({ where: { id: materialId } })

        await syncMaterialExpensesToCost(tx, params.id, user.userId)

        await tx.activityHistory.create({
          data: {
            workOrderId: params.id, userId: user.userId, action: "MATERIAL_DELETED",
            description: `Material "${material.materialName}" deleted by ${currentUser.name}`,
            metadata: { materialId },
          },
        })
      })

      return NextResponse.json({ message: "Deleted" })
    }

    if (materialId && (status === "APPROVED" || status === "REJECTED")) {
      const result = await prisma.$transaction(async (tx) => {
        const before = await tx.workOrderMaterial.findUnique({ where: { id: materialId } })
        if (!before) throw new Error("MATERIAL_NOT_FOUND")

        const material = await tx.workOrderMaterial.update({
          where: { id: materialId },
          data: { status: status as any },
        })

        const isReApproval = before.status === "APPROVED" && status === "APPROVED"

        if (!isReApproval) {
          const actionLabel = status === "APPROVED" ? "MATERIAL_APPROVED" : "MATERIAL_REJECTED"
          await tx.activityHistory.create({
            data: {
              workOrderId: params.id, userId: user.userId,
              action: actionLabel,
              description: `Material "${material.materialName}" ${status.toLowerCase()} by ${currentUser.name}`,
            },
          })
        }

        if (status === "APPROVED") {
          await syncMaterialExpensesToCost(tx, params.id, user.userId)

          if (!isReApproval) {
            await deductInventoryForMaterial(tx, material, user.userId)
          }

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
        } else if (status === "REJECTED") {
          await syncMaterialExpensesToCost(tx, params.id, user.userId)
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
