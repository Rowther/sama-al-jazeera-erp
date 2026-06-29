import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import { existsSync } from "fs"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads")
const LEGACY_UPLOAD_DIR = path.join(process.cwd(), "data", "uploads")

export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  let filePath = path.join(UPLOAD_DIR, ...params.path)

  if (!filePath.startsWith(UPLOAD_DIR)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  if (!existsSync(filePath)) {
    const legacyPath = path.join(LEGACY_UPLOAD_DIR, ...params.path)
    if (legacyPath.startsWith(LEGACY_UPLOAD_DIR) && existsSync(legacyPath)) {
      filePath = legacyPath
    } else {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }
  }

  try {
    const buffer = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
      ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
      ".pdf": "application/pdf", ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    const contentType = mimeMap[ext] || "application/octet-stream"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ message: "Error reading file" }, { status: 500 })
  }
}
