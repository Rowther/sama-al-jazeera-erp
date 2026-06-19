import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const workOrderId = searchParams.get("workOrderId")

  const where: any = {}
  if (workOrderId) where.workOrderId = workOrderId

  const activities = await prisma.activityHistory.findMany({
    where,
    include: { user: { select: { name: true, avatar: true } }, workOrder: { select: { workOrderId: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json({ activities }, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
  })
}
