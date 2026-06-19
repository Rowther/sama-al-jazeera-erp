import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, email: true, name: true, role: true },
    orderBy: { name: "asc" },
    take: 200,
  })

  return NextResponse.json({ users }, {
    headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" },
  })
}
