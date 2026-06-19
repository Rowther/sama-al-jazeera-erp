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

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50")), 200)
    const skip = (page - 1) * limit

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { workOrder: { select: { workOrderId: true } }, approvedBy: { select: { name: true } } },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ])

    return NextResponse.json({ expenses, total, page, totalPages: Math.ceil(total / limit) }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
    })
  } catch (error) {
    console.error("Expenses fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "ACCOUNTANT"])
    if (error) return error

    const data = await request.json()

    if (!data.category || !data.amount) {
      return NextResponse.json({ message: "Category and amount are required" }, { status: 400 })
    }

    const amount = parseFloat(data.amount)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ message: "Amount must be a positive number" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          workOrderId: data.workOrderId || null,
          category: data.category,
          amount,
          description: data.description || null,
          billUrl: data.billUrl || null,
          approvedById: user.userId,
        },
      })

      if (data.workOrderId) {
        const total = await tx.expense.aggregate({
          where: { workOrderId: data.workOrderId },
          _sum: { amount: true },
        })
        await tx.workOrder.update({
          where: { id: data.workOrderId },
          data: { totalCost: total._sum.amount || 0 },
        })
      }

      await tx.activityHistory.create({
        data: {
          workOrderId: data.workOrderId,
          userId: user.userId,
          action: "EXPENSE_ADDED",
          description: `Expense added: ${data.category} - ${amount}`,
          metadata: { category: data.category, amount },
        },
      })

      return expense
    })

    return NextResponse.json({ expense: result }, { status: 201 })
  } catch (error) {
    console.error("Expense create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}