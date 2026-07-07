import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const data = await request.json()

    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          workOrderId: params.id,
          category: data.category,
          amount: parseFloat(data.amount),
          description: data.description || null,
          date: data.date ? new Date(data.date) : new Date(),
          approvedById: user.userId,
        },
      })

      await tx.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: "EXPENSE_ADDED",
          description: `Expense added: ${data.category} - ${data.amount}${data.description ? ` (${data.description})` : ""}`,
        },
      })

      return exp
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error("Expense create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
