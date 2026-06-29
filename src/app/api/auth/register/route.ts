import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hashPassword, generateToken } from "@/lib/auth"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ message: "Email already exists" }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || "DESIGNER" },
    })

    // Automatically create Employee record for the user
    const count = await prisma.employee.count()
    await prisma.employee.create({
      data: {
        userId: user.id,
        employeeId: `EMP-${String(count + 1).padStart(3, "0")}`,
        phone: user.phone || null,
      },
    })

    const tokenPayload = { userId: user.id, email: user.email, role: user.role }
    const token = generateToken(tokenPayload)
    const sessionId = crypto.randomUUID()

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: sessionId },
    })

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
      sessionId,
    }, { status: 201 })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
