import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const fileType = formData.get("fileType") as string || "document"

    if (!file) return NextResponse.json({ message: "No file provided" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), "public", "uploads", "purchases", params.id)
    await mkdir(uploadDir, { recursive: true })

    const ext = file.name.split(".").pop()
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = path.join(uploadDir, uniqueName)
    await writeFile(filePath, buffer)

    const url = `/uploads/purchases/${params.id}/${uniqueName}`

    const doc = await prisma.purchaseDocument.create({
      data: {
        purchaseEntryId: params.id,
        fileUrl: url,
        fileType: fileType,
        uploadedById: user.userId,
      },
    })

    const entry = await prisma.purchaseEntry.findUnique({
      where: { id: params.id },
      select: { workOrderId: true },
    })

    await prisma.activityHistory.create({
      data: {
        workOrderId: entry?.workOrderId,
        userId: user.userId,
        action: "DOCUMENT_UPLOADED",
        description: `${fileType} uploaded for purchase entry`,
        metadata: { fileUrl: url, fileType, purchaseEntryId: params.id },
      },
    })

    return NextResponse.json({ document: doc, url }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: "Upload failed" }, { status: 500 })
  }
}
