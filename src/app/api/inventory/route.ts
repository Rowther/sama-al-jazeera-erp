import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
  const search = searchParams.get("search") || ""
  const category = searchParams.get("category") || ""
  const lowStock = searchParams.get("lowStock") === "true"

  const where: Prisma.InventoryItemWhereInput = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ]
  }

  if (category) {
    where.category = { name: category }
  }

  const skip = (page - 1) * limit

  let items: any[]
  let total: number

  if (lowStock) {
    const allMatching = await prisma.inventoryItem.findMany({
      where,
      include: { category: true, supplier: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    })
    const filtered = allMatching.filter((i) => i.stockQuantity <= i.minStock)
    total = filtered.length
    items = filtered.slice(skip, skip + limit)
  } else {
    ;[items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: { category: true, supplier: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.inventoryItem.count({ where }),
    ])
  }

  return NextResponse.json({
    inventory: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
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
