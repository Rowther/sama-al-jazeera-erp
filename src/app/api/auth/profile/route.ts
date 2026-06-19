import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function PUT(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request)
    if (!payload) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { name, email, phone } = await request.json()

    const updateData: Record<string, string> = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 })
    }

    if (email !== undefined) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing && existing.id !== payload.userId) {
        return NextResponse.json({ message: "Email already in use" }, { status: 409 })
      }
    }

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, avatar: true, phone: true },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
