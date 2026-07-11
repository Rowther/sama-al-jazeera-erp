import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER"])
    if (error) return error

    const workOrders = await prisma.workOrder.findMany({
      select: {
        id: true,
        workOrderId: true,
        advanceReceived: true,
        finalPrice: true,
      },
    })

    const results: { workOrderId: string; oldAdvance: number; installments: number; newAdvance: number }[] = []

    for (const wo of workOrders) {
      const installments = await prisma.installment.findMany({
        where: { workOrderId: wo.id },
        select: { amount: true },
      })
      const totalInstallments = installments.reduce((s, i) => s + i.amount, 0)

      if (totalInstallments > 0 && wo.advanceReceived < totalInstallments) {
        const newAdvance = wo.advanceReceived + totalInstallments
        const remainingAmount = wo.finalPrice
          ? Math.max(0, wo.finalPrice - newAdvance)
          : null

        await prisma.workOrder.update({
          where: { id: wo.id },
          data: {
            advanceReceived: newAdvance,
            remainingAmount,
          },
        })

        results.push({
          workOrderId: wo.workOrderId,
          oldAdvance: wo.advanceReceived,
          installments: totalInstallments,
          newAdvance,
        })
      }
    }

    return NextResponse.json({
      message: `Fixed ${results.length} work orders`,
      results,
    })
  } catch (err) {
    console.error("Fix error:", err)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
