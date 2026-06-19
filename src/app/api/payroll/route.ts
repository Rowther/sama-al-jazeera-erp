import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "HR", "ACCOUNTANT", "MANAGER"])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    const where: Record<string, unknown> = {}
    if (employeeId) where.employeeId = employeeId
    if (month) where.month = parseInt(month)
    if (year) where.year = parseInt(year)

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "100")), 200)
    const skip = (page - 1) * limit

    const [payrollRecords, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        include: { employee: { include: { user: { select: { name: true } } } } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        skip,
        take: limit,
      }),
      prisma.payroll.count({ where }),
    ])

    return NextResponse.json({ payrollRecords, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("Payroll fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "HR", "MANAGER"])
    if (error) return error

    const data = await request.json()

    if (!data.employeeId || !data.month || !data.year || !data.basicSalary) {
      return NextResponse.json({ message: "Employee, month, year, and basic salary are required" }, { status: 400 })
    }

    const existing = await prisma.payroll.findUnique({
      where: { employeeId_month_year: { employeeId: data.employeeId, month: data.month, year: data.year } },
    })

    if (existing) {
      return NextResponse.json({ message: "Payroll record already exists for this period" }, { status: 409 })
    }

    const basicSalary = parseFloat(data.basicSalary)
    const overtime = parseFloat(data.overtime || 0)
    const allowances = parseFloat(data.allowances || 0)
    const deductions = parseFloat(data.deductions || 0)
    const netSalary = basicSalary + overtime + allowances - deductions

    const record = await prisma.payroll.create({
      data: {
        employeeId: data.employeeId,
        month: data.month,
        year: data.year,
        basicSalary,
        overtime,
        allowances,
        deductions,
        netSalary,
        status: "PENDING",
      },
      include: { employee: { include: { user: { select: { name: true } } } } },
    })

    await prisma.activityHistory.create({
      data: {
        userId: user.userId,
        action: "PAYROLL_CREATED",
        description: `Payroll created for ${record.employee?.user?.name}: ${netSalary} AED (${data.month}/${data.year})`,
        metadata: { employeeId: data.employeeId, month: data.month, year: data.year, netSalary },
      },
    })

    return NextResponse.json({ payrollRecord: record }, { status: 201 })
  } catch (error) {
    console.error("Payroll create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}