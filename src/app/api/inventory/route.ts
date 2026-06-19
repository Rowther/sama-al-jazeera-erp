import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const lowStock = searchParams.get("lowStock")

  const items = await prisma.inventoryItem.findMany({
    include: { category: true, supplier: true },
    orderBy: { name: "asc" },
    take: 200,
  })

  const result = lowStock === "true"
    ? items.filter(i => i.stockQuantity <= i.minStock)
    : items

  return NextResponse.json({ inventory: result }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const data = await request.json()

  let category = await prisma.inventoryCategory.findUnique({ where: { name: data.category } })
  if (!category) {
    category = await prisma.inventoryCategory.create({ data: { name: data.category } })
  }

  const item = await prisma.inventoryItem.create({
    data: {
      name: data.name, categoryId: category.id, sku: data.sku || `SKU-${Date.now()}`,
      unit: data.unit, price: parseFloat(data.price), stockQuantity: parseFloat(data.stockQuantity || 0),
      minStock: parseFloat(data.minStock || 0), maxStock: parseFloat(data.maxStock || 999999),
      location: data.location, supplierId: data.supplierId, description: data.description,
    },
  })

  return NextResponse.json({ inventory: item }, { status: 201 })
}
