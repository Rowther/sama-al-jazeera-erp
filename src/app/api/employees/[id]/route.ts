import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request)
  if (!user || (user.role !== "OWNER" && user.role !== "MANAGER")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const data = await request.json()
  const { name, role, ...employeeData } = data

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { user: true },
  })
  if (!employee) return NextResponse.json({ message: "Employee not found" }, { status: 404 })

  if (name || role) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { ...(name && { name }), ...(role && { role }) },
    })
  }

  const updated = await prisma.employee.update({
    where: { id: params.id },
    data: {
      phone: employeeData.phone,
      address: employeeData.address,
      department: employeeData.department,
      designation: employeeData.designation,
      joiningDate: employeeData.joiningDate ? new Date(employeeData.joiningDate) : undefined,
      passportNumber: employeeData.passportNumber,
      passportExpiry: employeeData.passportExpiry ? new Date(employeeData.passportExpiry) : undefined,
      visaNumber: employeeData.visaNumber,
      visaExpiry: employeeData.visaExpiry ? new Date(employeeData.visaExpiry) : undefined,
      emiratesId: employeeData.emiratesId,
      salary: employeeData.salary ? parseFloat(employeeData.salary) : undefined,
      overtimeRate: employeeData.overtimeRate ? parseFloat(employeeData.overtimeRate) : undefined,
      workingHours: employeeData.workingHours ? parseFloat(employeeData.workingHours) : undefined,
    },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  })

  return NextResponse.json({ employee: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
  })
  if (!employee) return NextResponse.json({ message: "Employee not found" }, { status: 404 })

  await prisma.employee.delete({ where: { id: params.id } })
  await prisma.user.delete({ where: { id: employee.userId } })

  return NextResponse.json({ message: "Employee deleted" })
}
