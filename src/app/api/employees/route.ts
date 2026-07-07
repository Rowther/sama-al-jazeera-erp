import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
  const skip = (page - 1) * limit

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      include: { user: { select: { id: true, email: true, name: true, role: true } }, attendance: true, payroll: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.employee.count(),
  ])

  return NextResponse.json({ employees, total, page, totalPages: Math.ceil(total / limit) }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const data = await request.json()
  const noLoginRoles = ["LABOUR", "DRIVER"]
  const isNoLogin = noLoginRoles.includes(data.role)

  // For labour/driver, auto-generate credentials since they don't need login
  const email = data.email || (isNoLogin ? `${data.role.toLowerCase()}-${Date.now()}@internal.samaaljazeera.com` : undefined)
  const password = data.password || (isNoLogin ? await bcrypt.hash(Math.random().toString(36), 12) : "$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0nZ0yh0m0yf0z0x0y0z0W")

  const appUser = await prisma.user.create({
    data: {
      email,
      password,
      name: data.name,
      role: data.role || "DESIGNER",
      isActive: !isNoLogin,
    },
  })

  const count = await prisma.employee.count()
  const employee = await prisma.employee.create({
    data: {
      userId: appUser.id, employeeId: data.employeeId || `EMP-${String(count + 1).padStart(3, "0")}`,
      photo: data.photo, phone: data.phone, address: data.address, joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
      department: data.department, designation: data.designation, passportNumber: data.passportNumber,
      passportExpiry: data.passportExpiry ? new Date(data.passportExpiry) : null, visaNumber: data.visaNumber,
      visaExpiry: data.visaExpiry ? new Date(data.visaExpiry) : null, emiratesId: data.emiratesId,
      salary: data.salary ? parseFloat(data.salary) : null, overtimeRate: data.overtimeRate ? parseFloat(data.overtimeRate) : null,
      workingHours: data.workingHours ? parseFloat(data.workingHours) : null,
    },
  })

  return NextResponse.json({ employee }, { status: 201 })
}
