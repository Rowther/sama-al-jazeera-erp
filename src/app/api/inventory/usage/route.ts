import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") || "monthly"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  const now = new Date()
  let startDate: Date

  if (period === "daily") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
  } else if (period === "weekly") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
  } else {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1)
  }

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      type: "RESERVED",
      createdAt: { gte: startDate },
    },
    include: {
      item: { select: { id: true, name: true, unit: true, category: { select: { name: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const groups: Record<string, { itemId: string; itemName: string; unit: string; category: string; periods: Record<string, { total: number; count: number; movements: any[] }> }> = {}

  for (const m of movements) {
    const key = m.itemId
    if (!groups[key]) {
      groups[key] = { itemId: m.itemId, itemName: m.item.name, unit: m.item.unit, category: m.item.category?.name || "Uncategorized", periods: {} }
    }

    let periodKey: string
    if (period === "daily") {
      periodKey = m.createdAt.toISOString().slice(0, 10)
    } else if (period === "weekly") {
      const d = new Date(m.createdAt)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d.setDate(diff))
      periodKey = monday.toISOString().slice(0, 10)
    } else {
      periodKey = m.createdAt.toISOString().slice(0, 7)
    }

    if (!groups[key].periods[periodKey]) {
      groups[key].periods[periodKey] = { total: 0, count: 0, movements: [] }
    }
    groups[key].periods[periodKey].total += m.quantity
    groups[key].periods[periodKey].count += 1
    groups[key].periods[periodKey].movements.push({
      id: m.id,
      quantity: m.quantity,
      referenceId: m.referenceId,
      referenceType: m.referenceType,
      notes: m.notes,
      createdBy: m.createdBy.name,
      createdAt: m.createdAt,
    })
  }

  const items = Object.values(groups)
  const total = items.length
  const paginatedItems = items.slice((page - 1) * limit, page * limit)

  let allPeriodKeys = new Set<string>()
  for (const item of items) {
    for (const pk of Object.keys(item.periods)) {
      allPeriodKeys.add(pk)
    }
  }
  const sortedPeriods = Array.from(allPeriodKeys).sort()

  return NextResponse.json({
    usage: paginatedItems,
    periods: sortedPeriods,
    period,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
