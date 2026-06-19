import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "INVENTORY_MANAGER"])
    if (error) return error

    const materials = await prisma.workOrderMaterial.findMany({
      where: { workOrderId: params.id },
    })

    if (materials.length === 0) {
      return NextResponse.json({ message: "No materials found for this work order" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const allInventory = await tx.inventoryItem.findMany({
        include: { category: true },
      })

      const results = []

      for (const mat of materials) {
        const normalizedName = mat.materialName.toLowerCase().trim()
        const matchingItems = allInventory.filter((item) =>
          item.name.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(item.name.toLowerCase()) ||
          (mat.category && item.category?.name?.toLowerCase() === mat.category.toLowerCase())
        )

        const totalAvailable = matchingItems.reduce((sum, item) => sum + item.stockQuantity, 0)
        const requiredQty = mat.requiredQuantity

        let status: string
        let availableQty = 0
        let reservedQty = 0
        let missingQty = 0

        if (totalAvailable >= requiredQty) {
          status = "AVAILABLE"
          availableQty = requiredQty
          reservedQty = requiredQty
          missingQty = 0

          let remaining = requiredQty
          for (const item of matchingItems) {
            const reserveQty = Math.min(item.stockQuantity, remaining)
            if (reserveQty <= 0) continue
            remaining -= reserveQty

            await tx.inventoryMovement.create({
              data: {
                itemId: item.id,
                type: "RESERVED",
                quantity: reserveQty,
                referenceId: params.id,
                referenceType: "WORK_ORDER",
                notes: `Reserved for work order materials: ${mat.materialName}`,
                createdById: user.userId,
              },
            })
            await tx.inventoryItem.update({
              where: { id: item.id },
              data: { stockQuantity: { decrement: reserveQty } },
            })
          }
        } else if (totalAvailable > 0) {
          status = "PARTIALLY_AVAILABLE"
          availableQty = totalAvailable
          reservedQty = totalAvailable
          missingQty = requiredQty - totalAvailable

          for (const item of matchingItems) {
            if (item.stockQuantity <= 0) continue
            await tx.inventoryMovement.create({
              data: {
                itemId: item.id,
                type: "RESERVED",
                quantity: item.stockQuantity,
                referenceId: params.id,
                referenceType: "WORK_ORDER",
                notes: `Partially reserved for: ${mat.materialName}`,
                createdById: user.userId,
              },
            })
            await tx.inventoryItem.update({
              where: { id: item.id },
              data: { stockQuantity: 0 },
            })
          }
        } else {
          status = "OUT_OF_STOCK"
          availableQty = 0
          reservedQty = 0
          missingQty = requiredQty
        }

        await tx.workOrderMaterial.update({
          where: { id: mat.id },
          data: {
            status: status as any,
            availableQuantity: availableQty,
            reservedQuantity: reservedQty,
            missingQuantity: missingQty,
          },
        })

        results.push({
          materialName: mat.materialName,
          status,
          requiredQuantity: requiredQty,
          availableQuantity: availableQty,
          reservedQuantity: reservedQty,
          missingQuantity: missingQty,
          inventoryMatches: matchingItems.map((i) => ({ id: i.id, name: i.name, stock: i.stockQuantity })),
        })
      }

      const totalMissing = results.reduce((s: number, r: { missingQuantity: number }) => s + r.missingQuantity, 0)

      await tx.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: "INVENTORY_CHECKED",
          description: `Inventory check completed: ${results.filter((r: { status: string }) => r.status === "AVAILABLE").length} available, ${results.filter((r: { status: string }) => r.status === "PARTIALLY_AVAILABLE").length} partial, ${results.filter((r: { status: string }) => r.status === "OUT_OF_STOCK").length} out of stock`,
          metadata: { results, totalMissing },
        },
      })

      if (totalMissing > 0) {
        const order = await tx.workOrder.findUnique({
          where: { id: params.id },
          select: { workOrderId: true },
        })

        const missingItems = results
          .filter((r: { missingQuantity: number }) => r.missingQuantity > 0)
          .map((r: { materialName: string; missingQuantity: number }) => ({
            name: r.materialName,
            quantity: r.missingQuantity,
            unit: "pcs",
          }))

        const mrCount = await tx.materialRequest.count()
        const requestNumber = `MR-${String(mrCount + 1).padStart(4, "0")}`

        await tx.materialRequest.create({
          data: {
            requestNumber,
            title: `Auto: Shortage for ${order?.workOrderId || params.id}`,
            description: `Auto-created from inventory check. ${missingItems.length} material(s) are short.`,
            workOrderId: params.id,
            items: missingItems,
            status: "PENDING",
            requestedById: user.userId,
          },
        })
      }

      return { results, totalMissing }
    })

    const summary = {
      totalMaterials: result.results.length,
      available: result.results.filter((r: { status: string }) => r.status === "AVAILABLE").length,
      partial: result.results.filter((r: { status: string }) => r.status === "PARTIALLY_AVAILABLE").length,
      outOfStock: result.results.filter((r: { status: string }) => r.status === "OUT_OF_STOCK").length,
      totalMissing: result.totalMissing,
    }

    if (result.totalMissing > 0) {
      const approvers = await prisma.user.findMany({
        where: { role: { in: ["ACCOUNTANT", "MANAGER"] }, isActive: true },
        select: { id: true },
      })

      const order = await prisma.workOrder.findUnique({
        where: { id: params.id },
        select: { workOrderId: true },
      })

      await prisma.notification.createMany({
        data: approvers.map((a) => ({
          userId: a.id,
          type: "MATERIAL_REQUEST_CREATED" as any,
          title: `Material Request: Shortage in ${order?.workOrderId || params.id}`,
          message: `${result.totalMissing} item(s) short after inventory check`,
          link: `/material-requests`,
        })),
      })
    }

    return NextResponse.json({ results: result.results, summary })
  } catch (error) {
    console.error("Inventory check error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}