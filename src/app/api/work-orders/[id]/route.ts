import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest, requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const order = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        designs: {
          include: {
            revisions: { include: { createdBy: { select: { name: true } } } },
            approvals: { include: { approvedBy: { select: { name: true } } } },
            createdBy: { select: { name: true } },
          },
        },
        expenses: { include: { approvedBy: { select: { name: true } } } },
        payments: true,
        inventoryAllocation: { include: { item: true } },
        documents: true,
        activities: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 },
        teamMembers: { include: { user: { select: { id: true, name: true, role: true } } } },
        materials: { orderBy: { createdAt: "desc" } },
        purchaseEntries: {
          include: { items: true, documents: true, supplier: true, createdBy: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        workerAssignments: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { assignedDate: "desc" } },
        installments: { orderBy: { date: "desc" } },
        digitalSignature: { include: { approvedBy: { select: { id: true, name: true } } } },
        jobCard: { include: { generatedBy: { select: { id: true, name: true } } } },
        delayAlerts: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
        productionStages: {
          include: {
            assignedTo: { select: { id: true, name: true, role: true } },
            laborEntries: { include: { worker: { select: { id: true, name: true, role: true } } } },
          },
          orderBy: { sortOrder: "asc" },
        },
        workOrderItems: {
          include: {
            assignedLabourer: { select: { id: true, name: true, role: true } },
            workerAssignments: { include: { user: { select: { id: true, name: true, role: true } } } },
            productionStages: {
              include: {
                assignedTo: { select: { id: true, name: true, role: true } },
                laborEntries: { include: { worker: { select: { id: true, name: true, role: true } } } },
              },
              orderBy: { sortOrder: "asc" },
            },
            materials: { orderBy: { createdAt: "desc" } },
            laborEntries: { include: { worker: { select: { id: true, name: true, role: true } } } },
            expenses: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ message: "Work order not found" }, { status: 404 })
    }

    return NextResponse.json({ workOrder: order })
  } catch (error) {
    console.error("Work order fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const data = await request.json()

    const result = await prisma.$transaction(async (tx) => {
      const oldOrder = await tx.workOrder.findUnique({
        where: { id: params.id },
        include: { teamMembers: true },
      })
      if (!oldOrder) throw new Error("NOT_FOUND")

      const allowedFields = [
        "projectType", "furnitureType", "description", "priority", "dimensions", "items",
        "notes", "paymentTerms", "status", "assignedToId",
        "finalPrice", "remainingAmount",
        "productionManagerBudget", "productionManagerBudgetApproved",
        "productionManagerBudgetApprovedById",
        "companyName", "companyContact", "estimateRef",
      ]
      const updateData: Record<string, unknown> = {}
      for (const key of allowedFields) {
        if (data[key] !== undefined) updateData[key] = data[key]
      }

      if (data.dueDate) updateData.dueDate = new Date(data.dueDate)
      else if (data.dueDate === "") updateData.dueDate = null
      if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId || null
      if (data.estimatedBudget !== undefined && data.estimatedBudget !== "")
        updateData.estimatedBudget = parseFloat(data.estimatedBudget)
      else if (data.estimatedBudget === "") updateData.estimatedBudget = null
      if (data.advanceReceived !== undefined && data.advanceReceived !== "")
        updateData.advanceReceived = parseFloat(data.advanceReceived)
      if (data.totalCost !== undefined && data.totalCost !== "")
        updateData.totalCost = parseFloat(data.totalCost)
      if (data.productionManagerBudget !== undefined && data.productionManagerBudget !== "")
        updateData.productionManagerBudget = parseFloat(data.productionManagerBudget)
      if (data.productionManagerBudgetApprovedById !== undefined)
        updateData.productionManagerBudgetApprovedById = data.productionManagerBudgetApprovedById
      if (data.productionManagerBudgetApproved === true)
        updateData.productionManagerBudgetApprovedAt = new Date()

      if (data.customerName && oldOrder.customerId) {
        await tx.customer.update({
          where: { id: oldOrder.customerId },
          data: {
            name: data.customerName,
            ...(data.customerPhone !== undefined && { phone: data.customerPhone }),
            ...(data.customerLocation !== undefined && { location: data.customerLocation }),
          },
        })
      }

      if (data.status === "DESIGN_ASSIGNED" && data.assignedToId) {
        updateData.status = "DESIGN_ASSIGNED"
      }

      if (data.status === "DESIGN_COMPLETED") {
        const designs = await tx.design.findMany({ where: { workOrderId: params.id } })
        const hasFiles = designs.some(d => {
          const files = JSON.parse(JSON.stringify(d.files))
          return Array.isArray(files) && files.length > 0
        })
        if (!hasFiles) {
          throw new Error("Cannot mark complete without design files")
        }
      }

      if (data.teamMembers && Array.isArray(data.teamMembers)) {
        await tx.workOrderTeamMember.deleteMany({ where: { workOrderId: params.id } })

        const defaultRoles = await tx.user.findMany({
          where: { role: { in: ["INVENTORY_MANAGER", "ACCOUNTANT"] }, isActive: true },
          select: { id: true, role: true },
        })

        const allMembers = defaultRoles.map((u) => ({
          userId: u.id,
          role: u.role === "INVENTORY_MANAGER" ? "INVENTORY_MANAGER" : "ACCOUNTANT",
        }))

        for (const tm of data.teamMembers) {
          if (!allMembers.find((m) => m.userId === tm.userId)) {
            allMembers.push({ userId: tm.userId, role: tm.role || "WORKER" })
          }
        }

        await tx.workOrderTeamMember.createMany({
          data: allMembers.map((m) => ({ ...m, workOrderId: params.id })),
        })
      }

      // Sync WorkOrderItem records when items are provided
      if (data.items && Array.isArray(data.items)) {
        const submittedIds = data.items.filter((i: any) => i.id).map((i: any) => i.id)

        const orphanedItems = await tx.workOrderItem.findMany({
          where: { workOrderId: params.id, id: { notIn: submittedIds } },
          select: { id: true },
        })

        if (orphanedItems.length > 0) {
          const orphanedIds = orphanedItems.map((i) => i.id)
          await tx.workerAssignment.updateMany({ where: { workOrderItemId: { in: orphanedIds } }, data: { workOrderItemId: null } })
          await tx.workOrderMaterial.updateMany({ where: { workOrderItemId: { in: orphanedIds } }, data: { workOrderItemId: null } })
          await tx.laborEntry.updateMany({ where: { workOrderItemId: { in: orphanedIds } }, data: { workOrderItemId: null } })
          await tx.expense.updateMany({ where: { workOrderItemId: { in: orphanedIds } }, data: { workOrderItemId: null } })
          await tx.productionStage.updateMany({ where: { workOrderItemId: { in: orphanedIds } }, data: { workOrderItemId: null } })
          await tx.workOrderInventory.updateMany({ where: { workOrderItemId: { in: orphanedIds } }, data: { workOrderItemId: null } })
          await tx.workOrderItem.deleteMany({ where: { id: { in: orphanedIds } } })
        }

        for (const item of data.items.filter((i: any) => i.id)) {
          await tx.workOrderItem.update({
            where: { id: item.id },
            data: {
              name: item.name,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice != null ? item.unitPrice : undefined,
              totalPrice: item.totalPrice != null ? item.totalPrice : undefined,
              description: item.description || null,
              dimensions: item.dimensions || null,
              notes: item.notes || null,
              image: item.image || null,
            },
          })
        }

        const newItems = data.items.filter((i: any) => !i.id)
        if (newItems.length > 0) {
          await tx.workOrderItem.createMany({
            data: newItems.map((item: any) => ({
              workOrderId: params.id,
              name: item.name,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || null,
              totalPrice: item.totalPrice || null,
              description: item.description || null,
              dimensions: item.dimensions || null,
              notes: item.notes || null,
            })),
          })
        }
      }

      const order = await tx.workOrder.update({
        where: { id: params.id },
        data: updateData,
        include: {
          customer: true,
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          teamMembers: { include: { user: { select: { id: true, name: true, role: true } } } },
        },
      })

      const changes: string[] = []
      if (data.status && data.status !== oldOrder.status) {
        changes.push(`Status changed from ${oldOrder.status} to ${data.status}`)
      }

      if (data.status === "DESIGN_COMPLETED" && oldOrder.status !== "DESIGN_COMPLETED") {
        const approvers = await tx.user.findMany({
          where: { role: { in: ["OWNER", "MANAGER"] }, isActive: true },
        })
        if (approvers.length > 0) {
          await tx.notification.createMany({
            data: approvers.map((a) => ({
              userId: a.id,
              type: "APPROVAL_REQUIRED",
              title: "Design Approval Required",
              message: `Work order ${oldOrder.workOrderId} has completed design and needs approval`,
              link: `/work-orders/${params.id}`,
            })),
          })
        }
      }

      // Auto-tick job card checklist based on status changes
      const newStatus = data.status as string | undefined
      if (newStatus && newStatus !== oldOrder.status) {
        const jcUpdate: Record<string, boolean> = {}
        if (newStatus === "DESIGN_COMPLETED") jcUpdate.designCompleted = true
        if (newStatus === "DESIGN_APPROVED") jcUpdate.designApproved = true
        if (newStatus === "READY_FOR_PRODUCTION") {
          jcUpdate.materialSelectionDone = true
          jcUpdate.measurementsVerified = true
          if (oldOrder.estimatedBudget && oldOrder.estimatedBudget > 0) {
            jcUpdate.budgetApproved = true
          }
        }
        if (newStatus === "PRODUCTION_COMPLETED" || newStatus === "DELIVERED" || newStatus === "COMPLETED") {
          jcUpdate.productionCompleted = true
        }
        if (oldOrder.advanceReceived && oldOrder.advanceReceived > 0) {
          jcUpdate.advancePaymentReceived = true
        }
        if (Object.keys(jcUpdate).length > 0) {
          await tx.jobCard.updateMany({
            where: { workOrderId: params.id },
            data: jcUpdate,
          })
        }
      }

      if (data.assignedToId && data.assignedToId !== oldOrder.assignedToId) {
        const assignee = await tx.user.findUnique({ where: { id: data.assignedToId } })
        changes.push(`Assigned to ${assignee?.name || "unknown"}`)

        await tx.notification.create({
          data: {
            userId: data.assignedToId,
            type: "WORK_ORDER_ASSIGNED",
            title: "Work Order Reassigned",
            message: `Work order ${order.workOrderId} has been assigned to you`,
            link: `/work-orders/${order.id}`,
          },
        })
      }

      await tx.activityHistory.create({
        data: {
          workOrderId: params.id, userId: user.userId, action: "UPDATED",
          description: changes.join(", ") || "Work order updated",
        },
      })

      return order
    })

    return NextResponse.json({ workOrder: result })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ message: "Not found" }, { status: 404 })
      }
      if (error.message === "Cannot mark complete without design files") {
        return NextResponse.json({ message: error.message }, { status: 400 })
      }
    }
    console.error("Work order update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}