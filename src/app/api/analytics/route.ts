import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "ACCOUNTANT", "PRODUCTION_MANAGER"])
    if (error) return error

    const [
      statusCounts,
      expensesAgg,
      incomePaymentsAgg,
      employees,
      delayedCount,
      budgetOverruns,
      recentWorkOrders,
      workOrderIncomes,
    ] = await Promise.all([
      prisma.workOrder.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.payment.aggregate({
        where: { type: "INCOME" },
        _sum: { amount: true },
      }),
      prisma.employee.count(),
      prisma.workOrder.count({ where: { isDelayed: true } }),
      prisma.workOrder.findMany({
        where: { isDelayed: true },
        select: { id: true, workOrderId: true, delayDays: true, costOverrun: true },
        take: 100,
      }),
      prisma.workOrder.findMany({
        select: { id: true, workOrderId: true, totalCost: true, estimatedBudget: true, advanceReceived: true, finalPrice: true, profitMargin: true, status: true, costOverrun: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.payment.groupBy({
        by: ["workOrderId"],
        where: { type: "INCOME", workOrderId: { not: null } },
        _sum: { amount: true },
      }),
    ])

    const incomeByWO = new Map(workOrderIncomes.map(p => [p.workOrderId, p._sum.amount || 0]))
    const totalRevenue = incomePaymentsAgg._sum.amount || 0
    const totalCosts = expensesAgg._sum.amount || 0
    const totalWO = statusCounts.reduce((s, g) => s + g._count.id, 0)
    const completed = statusCounts
      .filter(g => g.status === "DELIVERED" || g.status === "COMPLETED" || g.status === "CLOSED")
      .reduce((s, g) => s + g._count.id, 0)
    const inProduction = statusCounts
      .filter(g => g.status === "PRODUCTION_STARTED" || g.status === "IN_PRODUCTION" || g.status === "PRODUCTION_COMPLETED")
      .reduce((s, g) => s + g._count.id, 0)
    const cancelled = statusCounts
      .filter(g => g.status === "CANCELLED")
      .reduce((s, g) => s + g._count.id, 0)
    const pending = totalWO - completed - cancelled

    const anomalies = [
      ...budgetOverruns.map(w => ({
        type: "delay" as const,
        severity: (w.delayDays > 14 ? "high" : w.delayDays > 7 ? "medium" : "low") as "high" | "medium" | "low",
        message: `Work Order ${w.workOrderId} is delayed by ${w.delayDays} days`,
        workOrderId: w.workOrderId,
      })),
      ...recentWorkOrders
        .filter(wo => wo.costOverrun > 0 && wo.estimatedBudget && wo.estimatedBudget > 0)
        .map(wo => ({
          type: "cost_overrun" as const,
          severity: ((wo.costOverrun / (wo.estimatedBudget || 1)) > 0.3 ? "high" : "medium") as "high" | "medium",
          message: `Work Order ${wo.workOrderId} has cost overrun of ${wo.costOverrun} AED`,
          workOrderId: wo.workOrderId,
        })),
    ]

    const profitByWO = recentWorkOrders
      .filter(wo => (incomeByWO.get(wo.id) || 0) > 0 || wo.finalPrice || (wo.estimatedBudget && wo.estimatedBudget > 0))
      .map(wo => ({
        workOrderId: wo.workOrderId,
        budget: wo.estimatedBudget || 0,
        actual: wo.totalCost,
        revenue: incomeByWO.get(wo.id) || 0,
        cost: wo.totalCost,
        profit: (incomeByWO.get(wo.id) || 0) - wo.totalCost,
        margin: wo.profitMargin || 0,
        status: wo.status,
      }))

    const cashFlow = {
      inflow: totalRevenue,
      outflow: totalCosts,
      net: totalRevenue - totalCosts,
    }

    return NextResponse.json({
      kpis: {
        totalWorkOrders: totalWO,
        completed,
        pending,
        delayed: delayedCount,
        inProduction,
        cancelled,
        totalRevenue,
        totalCosts,
        netProfit: totalRevenue - totalCosts,
        profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0,
        employees,
        expectedReceivables: 0,
        payables: 0,
      },
      profitByWO,
      anomalies,
      cashFlow,
    })
  } catch (error) {
    console.error("Analytics fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}