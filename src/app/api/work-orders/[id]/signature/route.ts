import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const signature = await prisma.digitalSignature.findUnique({
      where: { workOrderId: params.id },
      include: { approvedBy: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ signature })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER"])
    if (error) return error

    const data = await request.json()
    const { signatureType, signatureData, approvalPin } = data

    if (!signatureType) {
      return NextResponse.json({ message: "Signature type is required" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.digitalSignature.findUnique({ where: { workOrderId: params.id } })
      if (existing) {
        throw new Error("ALREADY_SIGNED")
      }

      const signature = await tx.digitalSignature.create({
        data: {
          workOrderId: params.id,
          approvedById: user.userId,
          signatureType: signatureType || "DRAWN",
          signatureData: signatureData || null,
          approvalPin: approvalPin || null,
        },
        include: { approvedBy: { select: { id: true, name: true } } },
      })

      await tx.workOrder.update({
        where: { id: params.id },
        data: { status: "READY_FOR_DELIVERY" },
      })

      const order = await tx.workOrder.findUnique({
        where: { id: params.id },
        select: { workOrderId: true },
      })

      await tx.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: "DIGITAL_SIGNATURE",
          description: `Work order ${order?.workOrderId} digitally signed by ${user.userId}`,
          metadata: { signatureType },
        },
      })

      const inventoryManager = await tx.user.findMany({
        where: { role: "INVENTORY_MANAGER", isActive: true },
      })
      if (inventoryManager.length > 0) {
        await tx.notification.createMany({
          data: inventoryManager.map((im) => ({
            userId: im.id,
            type: "APPROVAL_REQUIRED",
            title: "Work Order Ready for Delivery",
            message: `Work order ${order?.workOrderId} is signed and ready for delivery`,
            link: `/work-orders/${params.id}`,
          })),
        })
      }

      return signature
    })

    return NextResponse.json({ signature: result }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_SIGNED") {
      return NextResponse.json({ message: "Work order already has a digital signature" }, { status: 400 })
    }
    console.error("Signature error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
