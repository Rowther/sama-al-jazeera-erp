import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const data = await request.json()

    const isVoid = data.status === "VOID"
    const isUnvoid = data.status === "UNVOID"

    if ((isVoid || isUnvoid) && !["OWNER", "MANAGER", "DESIGNER"].includes(user.role)) {
      return NextResponse.json({ message: `You are not allowed to ${isVoid ? "void" : "restore"} a design` }, { status: 403 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const design = await tx.design.findUnique({ where: { id: params.id } })
      if (!design) throw new Error("NOT_FOUND")

      let nextStatus: string | undefined = data.status
      if (isUnvoid) {
        const previous = await tx.designApproval.findFirst({
          where: { designId: params.id, status: { not: "VOID" } },
          orderBy: { createdAt: "desc" },
        })
        nextStatus = previous?.status || "PENDING_REVIEW"
      }

      const updated = await tx.design.update({
        where: { id: params.id },
        data: {
          ...(nextStatus ? { status: nextStatus as any } : {}),
          ...(data.files ? { files: data.files } : {}),
        },
      })

      if (nextStatus === "APPROVED") {
        await tx.workOrder.update({
          where: { id: design.workOrderId },
          data: { status: "DESIGN_APPROVED" },
        })
      }

      if (nextStatus) {
        await tx.designApproval.create({
          data: {
            designId: params.id,
            approvedById: user.userId,
            status: nextStatus as any,
            comments: data.comments || null,
          },
        })
      }

      if (nextStatus === "APPROVED" || nextStatus === "REVISION_REQUESTED" || nextStatus === "REJECTED") {
        await tx.notification.create({
          data: {
            userId: design.createdById,
            type: nextStatus === "APPROVED" ? "APPROVAL_REQUIRED" as const : "DESIGN_REVISION_REQUESTED" as const,
            title: `Design ${nextStatus.toLowerCase()}`,
            message: data.comments || `Design has been ${nextStatus.toLowerCase()}`,
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