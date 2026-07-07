import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const item = await prisma.inventoryItem.findUnique({
    where: { id: params.id },
    include: { category: true, supplier: { select: { id: true, name: true } } },
  })

  if (!item) return NextResponse.json({ message: "Not found" }, { status: 404 })

  return NextResponse.json({ inventory: item })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const data = await request.json()

  const existing = await prisma.inventoryItem.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 })

  let categoryId = existing.categoryId
  if (data.category) {
    let category = await prisma.inventoryCategory.findUnique({ where: { name: data.category } })
    if (!category) category = await prisma.inventoryCategory.create({ data: { name: data.category } })
    categoryId = category.id
  }

  const item = await prisma.inventoryItem.update({
    where: { id: params.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { categoryId }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.price !== undefined && { price: parseFloat(data.price) }),
      ...(data.stockQuantity !== undefined && { stockQuantity: parseFloat(data.stockQuantity) }),
      ...(data.minStock !== undefined && { minStock: parseFloat(data.minStock) }),
      ...(data.maxStock !== undefined && { maxStock: parseFloat(data.maxStock) }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.description !== undefined && { description: data.description }),
    },
    include: { category: true },
  })

  return NextResponse.json({ inventory: item })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const existing = await prisma.inventoryItem.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 })

  await prisma.inventoryItem.delete({ where: { id: params.id } })

  return NextResponse.json({ message: "Deleted" })
}
