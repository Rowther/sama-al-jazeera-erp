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

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      include: { workOrder: { select: { workOrderId: true } }, receivedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count(),
  ])

  return NextResponse.json({ payments, total, page, totalPages: Math.ceil(total / limit) }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const data = await request.json()
  const payment = await prisma.payment.create({
    data: {
      workOrderId: data.workOrderId, type: data.type, amount: parseFloat(data.amount),
      status: data.status || "PENDING", reference: data.reference, notes: data.notes, receivedById: user.userId,
    },
  })

  return NextResponse.json({ payment }, { status: 201 })
}
