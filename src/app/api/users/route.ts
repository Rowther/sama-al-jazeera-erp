import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest, requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, employee: { select: { designation: true } } },
    orderBy: { name: "asc" },
    take: 200,
  })

  return NextResponse.json({ users }, {
    headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" },
  })
}

export async function DELETE(request: NextRequest) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER"])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")
    if (!userId) return NextResponse.json({ message: "User ID required" }, { status: 400 })

    if (userId === user.userId) {
      return NextResponse.json({ message: "Cannot delete your own account" }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!targetUser) return NextResponse.json({ message: "User not found" }, { status: 404 })

    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ message: "User deleted" })
  } catch (err) {
    console.error("Delete user error:", err)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
