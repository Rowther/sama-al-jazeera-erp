import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string; expenseId: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER"])
    if (error) return error

    const data = await request.json()

    const expense = await prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({ where: { id: params.expenseId } })
      if (!existing || existing.workOrderId !== params.id) {
        throw new Error("Expense not found")
      }

      const updated = await tx.expense.update({
        where: { id: params.expenseId },
        data: {
          ...(data.category && { category: data.category }),
          ...(data.amount && { amount: parseFloat(data.amount) }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.date && { date: new Date(data.date) }),
        },
      })

      await tx.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: "EXPENSE_UPDATED",
          description: `Expense updated: ${data.category || existing.category} - ${data.amount || existing.amount}`,
        },
      })

      return updated
    })

    return NextResponse.json({ expense })
  } catch (error: any) {
    console.error("Expense update error:", error)
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; expenseId: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER"])
    if (error) return error

    const expense = await prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({ where: { id: params.expenseId } })
      if (!existing || existing.workOrderId !== params.id) {
        throw new Error("Expense not found")
      }

      await tx.expense.delete({ where: { id: params.expenseId } })

      await tx.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: "EXPENSE_DELETED",
          description: `Expense deleted: ${existing.category} - ${existing.amount}`,
        },
      })

      return existing
    })

    return NextResponse.json({ message: "Expense deleted", expense })
  } catch (error: any) {
    console.error("Expense delete error:", error)
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 })
  }
}
