import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ message: "No file provided" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const publicDir = path.join(process.cwd(), "public", "uploads", "designs")
    const dataDir = path.join(process.cwd(), "data", "uploads", "designs")
    await mkdir(publicDir, { recursive: true })
    await mkdir(dataDir, { recursive: true })

    const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    await writeFile(path.join(publicDir, uniqueName), buffer)
    await writeFile(path.join(dataDir, uniqueName), buffer)

    const url = `/api/uploads/designs/${uniqueName}`

    return NextResponse.json({ url, name: file.name })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ message: "Upload failed" }, { status: 500 })
  }
}
