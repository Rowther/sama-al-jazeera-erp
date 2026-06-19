import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
  const skip = (page - 1) * limit

  const [purchases, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      include: { supplier: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseOrder.count(),
  ])
  return NextResponse.json({ purchases, total, page, totalPages: Math.ceil(total / limit) }, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
  })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const data = await request.json()
  const count = await prisma.purchaseOrder.count()
  const poNumber = data.poNumber || `PO-${String(count + 1).padStart(4, "0")}`

  const purchase = await prisma.purchaseOrder.create({
    data: {
      poNumber, purchaseType: data.purchaseType || "CASH", supplierId: data.supplierId,
      amount: parseFloat(data.amount), billUrl: data.billUrl, invoiceUrl: data.invoiceUrl,
      items: data.items || [], notes: data.notes, createdById: user.userId,
    },
  })

  return NextResponse.json({ purchase }, { status: 201 })
}
