import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "ACCOUNTANT"])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get("months") || "6")

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

    const [
      monthlyPayments,
      monthlyExpenses,
      monthlyPayroll,
      pendingPayments,
      pendingExpenses,
      recentWorkOrders,
    ] = await Promise.all([
      prisma.payment.groupBy({
        by: ["date"],
        where: { date: { gte: startDate }, type: "INCOME" },
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ["date"],
        where: { date: { gte: startDate } },
        _sum: { amount: true },
      }),
      prisma.payroll.groupBy({
        by: ["month", "year"],
        where: {
          year: { gte: startDate.getFullYear() },
          status: "PAID",
        },
        _sum: { netSalary: true },
      }),
      prisma.payment.findMany({
        where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } },
        select: {
          id: true,
          amount: true,
          type: true,
          status: true,
          date: true,
          workOrder: { select: { workOrderId: true, customer: { select: { name: true } } } },
          notes: true,
        },
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.expense.findMany({
        where: { approvedById: null },
        select: {
          id: true,
          amount: true,
          category: true,
          description: true,
          date: true,
          workOrder: { select: { workOrderId: true } },
        },
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.workOrder.findMany({
        where: {
          status: { notIn: ["DELIVERED", "CLOSED", "CANCELLED"] },
          dueDate: { not: null },
        },
        select: {
          workOrderId: true,
          dueDate: true,
          remainingAmount: true,
          finalPrice: true,
          customer: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 50,
      }),
    ])

    const monthlyData: Record<string, { income: number; expenses: number; payroll: number }> = {}
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthlyData[key] = { income: 0, expenses: 0, payroll: 0 }
    }

    for (const p of monthlyPayments) {
      const d = new Date(p.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (monthlyData[key]) monthlyData[key].income += p._sum.amount || 0
    }

    for (const e of monthlyExpenses) {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (monthlyData[key]) monthlyData[key].expenses += e._sum.amount || 0
    }

    for (const pr of monthlyPayroll) {
      const key = `${pr.year}-${String(pr.month).padStart(2, "0")}`
      if (monthlyData[key]) monthlyData[key].payroll += pr._sum.netSalary || 0
    }

    const monthlyCashFlow = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        payroll: data.payroll,
        net: data.income - data.expenses - data.payroll,
      }))

    const totalPendingReceivables = pendingPayments.reduce((s, p) => s + p.amount, 0)
    const totalPendingExpenses = pendingExpenses.reduce((s, e) => s + e.amount, 0)
    const totalExpectedRevenue = recentWorkOrders.reduce((s, wo) => s + (wo.finalPrice || wo.remainingAmount || 0), 0)

    return NextResponse.json({
      monthlyCashFlow,
      pendingPayments,
      pendingExpenses,
      expectedRevenue: recentWorkOrders,
      summary: {
        totalPendingReceivables,
        totalPendingExpenses,
        totalExpectedRevenue,
        currentCashBalance: monthlyCashFlow.length > 0
          ? monthlyCashFlow.reduce((s, m) => s + m.net, 0)
          : 0,
        averageMonthlyIncome: monthlyCashFlow.length > 0
          ? monthlyCashFlow.reduce((s, m) => s + m.income, 0) / monthlyCashFlow.length
          : 0,
        averageMonthlyExpenses: monthlyCashFlow.length > 0
          ? monthlyCashFlow.reduce((s, m) => s + m.expenses + m.payroll, 0) / monthlyCashFlow.length
          : 0,
        burnRate: monthlyCashFlow.length > 0
          ? monthlyCashFlow.reduce((s, m) => s + m.expenses + m.payroll, 0) / monthlyCashFlow.length
          : 0,
      },
    })
  } catch (error) {
    console.error("Cash flow error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
