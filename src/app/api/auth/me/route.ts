import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request)
    if (!payload) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, avatar: true, phone: true },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Me error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
