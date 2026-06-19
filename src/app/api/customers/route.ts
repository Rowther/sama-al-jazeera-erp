import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const customers = await prisma.customer.findMany({
    include: { _count: { select: { workOrders: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  })
  return NextResponse.json({ customers }, {
    headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" },
  })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const data = await request.json()
  const customer = await prisma.customer.create({ data: { name: data.name, phone: data.phone, email: data.email, location: data.location, notes: data.notes } })
  return NextResponse.json({ customer }, { status: 201 })
}
