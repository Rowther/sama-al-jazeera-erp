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
          if (item.workOrderMaterialId) {
            await prisma.workOrderMaterial.update({
              where: { id: item.workOrderMaterialId },
              data: { status: "APPROVED" },
            })
          } else if (item.name && existing.workOrderId) {
            const matched = await prisma.workOrderMaterial.findFirst({
              where: {
                workOrderId: existing.workOrderId,
                materialName: { contains: item.name, mode: "insensitive" },
                status: { notIn: ["APPROVED", "REJECTED"] },
              },
              orderBy: { createdAt: "desc" },
            })
            if (matched) {
              await prisma.workOrderMaterial.update({
                where: { id: matched.id },
                data: { status: "APPROVED" },
              })
            }
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
