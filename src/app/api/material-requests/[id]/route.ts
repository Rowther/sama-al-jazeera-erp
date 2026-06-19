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
