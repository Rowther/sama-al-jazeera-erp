import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hashPassword, generateToken, generateRefreshToken } from "@/lib/auth"

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

    const tokenPayload = { userId: user.id, email: user.email, role: user.role }
    const token = generateToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    })

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    }, { status: 201 })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
