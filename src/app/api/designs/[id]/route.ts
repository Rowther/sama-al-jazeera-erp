import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const data = await request.json()

    const result = await prisma.$transaction(async (tx) => {
      const design = await tx.design.findUnique({ where: { id: params.id } })
      if (!design) throw new Error("NOT_FOUND")

      const updated = await tx.design.update({
        where: { id: params.id },
        data: {
          ...(data.status ? { status: data.status } : {}),
          ...(data.files ? { files: data.files } : {}),
        },
      })

      if (data.status === "APPROVED") {
        await tx.workOrder.update({
          where: { id: design.workOrderId },
          data: { status: "DESIGN_APPROVED" },
        })
      }

      if (data.status) {
        await tx.designApproval.create({
          data: {
            designId: params.id,
            approvedById: user.userId,
            status: data.status,
            comments: data.comments || null,
          },
        })
      }

      if (data.status === "APPROVED" || data.status === "REVISION_REQUESTED" || data.status === "REJECTED") {
        await tx.notification.create({
          data: {
            userId: design.createdById,
            type: data.status === "APPROVED" ? "APPROVAL_REQUIRED" as const : "DESIGN_REVISION_REQUESTED" as const,
            title: `Design ${data.status.toLowerCase()}`,
            message: data.comments || `Design has been ${data.status.toLowerCase()}`,
            link: `/work-orders/${design.workOrderId}`,
          },
        })
      }

      return updated
    })

    return NextResponse.json({ design: result })
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }
    console.error("Design update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}