import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest, comparePassword, hashPassword } from "@/lib/auth"

export async function PUT(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request)
    if (!payload) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: "Current password and new password are required" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: "New password must be at least 6 characters" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { password: true },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const isValid = await comparePassword(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json({ message: "Current password is incorrect" }, { status: 401 })
    }

    const hashedPassword = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: payload.userId },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ message: "Password updated successfully" })
  } catch (error) {
    console.error("Password update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
