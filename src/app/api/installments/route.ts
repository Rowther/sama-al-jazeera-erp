import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const { searchParams } = new URL(request.url)
    const workOrderId = searchParams.get("workOrderId")

    const where: Record<string, unknown> = {}
    if (workOrderId) where.workOrderId = workOrderId

    const installments = await prisma.installment.findMany({
      where,
      orderBy: { date: "desc" },
    })

    return NextResponse.json({ installments })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "ACCOUNTANT"])
    if (error) return error

    const data = await request.json()
    const { workOrderId, amount, notes } = data

    if (!workOrderId || !amount) {
      return NextResponse.json({ message: "Work order ID and amount are required" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const installment = await tx.installment.create({
        data: {
          workOrderId,
          amount: parseFloat(amount),
          notes: notes || null,
        },
      })

      const workOrder = await tx.workOrder.findUnique({
        where: { id: workOrderId },
        select: { advanceReceived: true, finalPrice: true, workOrderId: true },
      })
      if (!workOrder) throw new Error("NOT_FOUND")

      const allInstallments = await tx.installment.findMany({
        where: { workOrderId },
        select: { amount: true },
      })
      const totalPaid = (workOrder.advanceReceived || 0) + allInstallments.reduce((s, i) => s + i.amount, 0)
      const remainingAmount = workOrder.finalPrice
        ? Math.max(0, workOrder.finalPrice - totalPaid)
        : null

      await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          remainingAmount,
        },
      })

      await tx.payment.create({
        data: {
          workOrderId,
          type: "INSTALLMENT",
          amount: parseFloat(amount),
          status: "PAID",
          notes: notes || "Installment payment",
          receivedById: user.userId,
        },
      })

      const accountants = await tx.user.findMany({
        where: { role: "ACCOUNTANT", isActive: true },
      })
      if (accountants.length > 0) {
        await tx.notification.createMany({
          data: accountants.map((a) => ({
            userId: a.id,
            type: "ADVANCE_RECEIVED",
            title: "Installment Received",
            message: `AED ${amount} installment received for WO ${workOrder.workOrderId}`,
            link: `/work-orders/${workOrderId}`,
          })),
        })
      }

      return installment
    })

    return NextResponse.json({ installment: result }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Work order not found" }, { status: 404 })
    }
    console.error("Installment error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
