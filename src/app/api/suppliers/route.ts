import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { purchases: true, items: true } } },
    orderBy: { name: "asc" },
    take: 200,
  })
  return NextResponse.json({ suppliers }, {
    headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" },
  })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  const data = await request.json()
  const supplier = await prisma.supplier.create({ data: { name: data.name, phone: data.phone, email: data.email, address: data.address, contactPerson: data.contactPerson, notes: data.notes } })
  return NextResponse.json({ supplier }, { status: 201 })
}
