import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const workOrderId = searchParams.get("workOrderId")
    const status = searchParams.get("status")

    const where: any = {}
    if (workOrderId) where.workOrderId = workOrderId
    if (status) where.status = status

    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
    const skip = (page - 1) * limit

    const [materials, total] = await Promise.all([
      prisma.workOrderMaterial.findMany({
        where,
        include: {
          workOrder: { select: { workOrderId: true, id: true } },
          purchaseEntryItems: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.workOrderMaterial.count({ where }),
    ])

    return NextResponse.json({ materials, total, page, totalPages: Math.ceil(total / limit) }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
