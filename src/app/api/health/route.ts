import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`

    const [workOrderCount, userCount, employeeCount] = await Promise.all([
      prisma.workOrder.count(),
      prisma.user.count(),
      prisma.employee.count(),
    ])

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
      stats: {
        workOrders: workOrderCount,
        users: userCount,
        employees: employeeCount,
      },
      memory: process.memoryUsage(),
    }, {
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 503 })
  }
}