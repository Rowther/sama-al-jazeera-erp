import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const [
      stageData,
      workOrders,
      workerAssignments,
      delayedStages,
    ] = await Promise.all([
      prisma.productionStage.findMany({
        select: {
          stageName: true,
          status: true,
          duration: true,
          isDelayed: true,
          delayMinutes: true,
          department: true,
          completionPercentage: true,
        },
      }),
      prisma.workOrder.findMany({
        where: {
          productionStartedAt: { not: null },
          productionCompletedAt: { not: null },
        },
        select: {
          workOrderId: true,
          productionStartedAt: true,
          productionCompletedAt: true,
          isDelayed: true,
          delayDays: true,
          actualLaborCost: true,
          totalCost: true,
        },
      }),
      prisma.workerAssignment.groupBy({
        by: ["role"],
        _avg: { totalHoursWorked: true, totalCost: true, progress: true },
        _count: { id: true },
      }),
      prisma.productionStage.count({ where: { isDelayed: true } }),
    ])

    const totalStages = stageData.length
    const completedStages = stageData.filter((s) => s.status === "COMPLETED").length
    const inProgressStages = stageData.filter((s) => s.status === "IN_PROGRESS").length
    const delayedStageCount = stageData.filter((s) => s.isDelayed).length

    const stageCompletionTimes: Record<string, number[]> = {}
    for (const s of stageData) {
      if (s.duration && s.status === "COMPLETED") {
        if (!stageCompletionTimes[s.stageName]) stageCompletionTimes[s.stageName] = []
        stageCompletionTimes[s.stageName].push(s.duration)
      }
    }

    const avgStageTimes = Object.entries(stageCompletionTimes).map(([name, times]) => ({
      stageName: name,
      avgDuration: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      count: times.length,
    }))

    const stageStatusCounts = stageData.reduce((acc: Record<string, number>, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const departmentPerformance = stageData.reduce((acc: Record<string, { total: number; completed: number; delayed: number; durations: number[] }>, s) => {
      const dept = s.department || "Unknown"
      if (!acc[dept]) acc[dept] = { total: 0, completed: 0, delayed: 0, durations: [] }
      acc[dept].total++
      if (s.status === "COMPLETED") acc[dept].completed++
      if (s.isDelayed) acc[dept].delayed++
      if (s.duration) acc[dept].durations.push(s.duration)
      return acc
    }, {} as Record<string, any>)

    const deptEfficiency = Object.entries(departmentPerformance).map(([dept, data]) => ({
      department: dept,
      totalStages: data.total,
      completed: data.completed,
      delayed: data.delayed,
      delayRate: data.total > 0 ? Math.round((data.delayed / data.total) * 100) : 0,
      avgDuration: data.durations.length > 0
        ? Math.round(data.durations.reduce((a: number, b: number) => a + b, 0) / data.durations.length)
        : 0,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }))

    const avgProductionTime = workOrders.length > 0
      ? workOrders.reduce((s, wo) => {
          const start = wo.productionStartedAt?.getTime()
          const end = wo.productionCompletedAt?.getTime()
          return s + (start && end ? (end - start) / (1000 * 60 * 60) : 0)
        }, 0) / workOrders.length
      : 0

    const totalLaborCost = workOrders.reduce((s, wo) => s + wo.actualLaborCost, 0)

    const roleEfficiency = workerAssignments.map((r) => ({
      role: r.role,
      workerCount: r._count.id,
      avgHours: Math.round(r._avg.totalHoursWorked || 0),
      avgCost: Math.round(r._avg.totalCost || 0),
      avgProgress: Math.round(r._avg.progress || 0),
    }))

    const bottleneckStages = Object.entries(stageCompletionTimes)
      .map(([name, times]) => ({
        stageName: name,
        avgDuration: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        count: times.length,
        severity: times.length > 3 && Math.round(times.reduce((a, b) => a + b, 0) / times.length) > 120 ? "high" : "medium",
      }))
      .filter((s) => s.severity === "high")
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5)

    return NextResponse.json({
      summary: {
        totalStages,
        completedStages,
        inProgressStages,
        delayedStages: delayedStageCount,
        completionRate: totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0,
        avgProductionTimeHours: Math.round(avgProductionTime * 10) / 10,
        totalLaborCost,
        completedWorkOrders: workOrders.length,
        bottleneckCount: bottleneckStages.length,
      },
      avgStageTimes,
      stageStatusCounts,
      departmentEfficiency: deptEfficiency,
      roleEfficiency,
      bottleneckStages,
      stageStatusDistribution: Object.entries(stageStatusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: totalStages > 0 ? Math.round((count / totalStages) * 100) : 0,
      })),
    })
  } catch (error) {
    console.error("Production analytics error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
