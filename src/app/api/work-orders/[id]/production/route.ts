import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

const validActions = ["START", "PAUSE", "RESUME", "COMPLETE"] as const

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "PRODUCTION_MANAGER"])
    if (error) return error

    const data = await request.json()
    const action = data.action as string

    if (!validActions.includes(action as any)) {
      return NextResponse.json({ message: `Invalid action. Must be one of: ${validActions.join(", ")}` }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.workOrder.findUnique({
        where: { id: params.id },
        select: { id: true, workOrderId: true, status: true },
      })
      if (!order) throw new Error("NOT_FOUND")

      let newStatus = order.status
      const now = new Date()

      switch (action) {
        case "START":
          if (order.status === "MATERIAL_REVIEW" || order.status === "READY_FOR_PRODUCTION" || order.status === "DESIGN_APPROVED") {
            newStatus = "IN_PRODUCTION"
            await tx.workOrder.update({
              where: { id: params.id },
              data: { status: newStatus, productionStartedAt: now },
            })
          }
          break
        case "PAUSE":
          if (order.status === "IN_PRODUCTION" || order.status === "PRODUCTION_STARTED") {
            newStatus = "MATERIAL_REVIEW"
            await tx.workOrder.update({
              where: { id: params.id },
              data: { status: newStatus },
            })
          }
          break
        case "RESUME":
          if (order.status === "MATERIAL_REVIEW") {
            newStatus = "IN_PRODUCTION"
            await tx.workOrder.update({
              where: { id: params.id },
              data: { status: newStatus },
            })
          }
          break
        case "COMPLETE":
          if (order.status === "IN_PRODUCTION" || order.status === "PRODUCTION_STARTED") {
            newStatus = "PRODUCTION_COMPLETED"
            await tx.workOrder.update({
              where: { id: params.id },
              data: { status: newStatus, productionCompletedAt: now },
            })

            const orderData = await tx.workOrder.findUnique({
              where: { id: params.id },
              include: {
                customer: true,
                createdBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
                teamMembers: { include: { user: { select: { id: true, name: true, role: true } } } },
                workerAssignments: { include: { user: { select: { id: true, name: true, role: true } } } },
                materials: true,
                designs: true,
                expenses: true,
                payments: true,
                installments: true,
              },
            })
            if (orderData) {
              await tx.jobCard.create({
                data: {
                  workOrderId: params.id,
                  generatedById: user.userId,
                },
              })
            }

            const managersAndOwners = await tx.user.findMany({
              where: { role: { in: ["OWNER", "MANAGER"] }, isActive: true },
            })
            if (managersAndOwners.length > 0) {
              await tx.notification.createMany({
                data: managersAndOwners.map((m) => ({
                  userId: m.id,
                  type: "APPROVAL_REQUIRED",
                  title: "Digital Signature Required",
                  message: `Work order ${order.workOrderId} production completed. Digital signature needed for delivery.`,
                  link: `/work-orders/${params.id}`,
                })),
              })
            }
          }
          break
      }

      await tx.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: `PRODUCTION_${action}`,
          description: `Production ${action.toLowerCase()}d for work order ${order.workOrderId}`,
          metadata: { action, previousStatus: order.status, newStatus },
        },
      })

      return { newStatus, previousStatus: order.status }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Work order not found" }, { status: 404 })
    }
    console.error("Production action error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
