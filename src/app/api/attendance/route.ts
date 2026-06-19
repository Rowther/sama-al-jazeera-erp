import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const where: Record<string, unknown> = {}
    if (employeeId) where.employeeId = employeeId
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(from)
      if (to) (where.date as Record<string, unknown>).lte = new Date(to)
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "100")), 200)
    const skip = (page - 1) * limit

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: { employee: { include: { user: { select: { name: true } } } } },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ])

    return NextResponse.json({ attendance: records, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("Attendance fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "HR", "MANAGER"])
    if (error) return error

    const data = await request.json()

    if (!data.employeeId || !data.date) {
      return NextResponse.json({ message: "Employee ID and date are required" }, { status: 400 })
    }

    const date = new Date(data.date)
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: data.employeeId, date } },
    })
    if (existing) {
      return NextResponse.json({ message: "Attendance record already exists for this date" }, { status: 409 })
    }

    const checkIn = data.checkIn ? new Date(data.checkIn) : null
    const checkOut = data.checkOut ? new Date(data.checkOut) : null
    let hoursWorked = data.hoursWorked ? parseFloat(data.hoursWorked) : null
    if (checkIn && checkOut && !hoursWorked) {
      hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
    }

    const record = await prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        date,
        checkIn,
        checkOut,
        hoursWorked,
        status: data.status || "PRESENT",
        notes: data.notes || null,
      },
      include: { employee: { include: { user: { select: { name: true } } } } },
    })

    return NextResponse.json({ attendance: record }, { status: 201 })
  } catch (error) {
    console.error("Attendance create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}