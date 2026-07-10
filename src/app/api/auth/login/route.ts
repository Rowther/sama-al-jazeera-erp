import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { comparePassword, generateToken } from "@/lib/auth"
import crypto from "crypto"

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ message: "Account is deactivated" }, { status: 403 })
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000)
      return NextResponse.json({
        message: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
      }, { status: 423 })
    }

    const isValid = await comparePassword(password, user.password)
    if (!isValid) {
      const attempts = user.loginAttempts + 1
      const updateData: { loginAttempts: number; lockoutUntil?: Date } = { loginAttempts: attempts }

      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData })

      const remaining = MAX_LOGIN_ATTEMPTS - attempts
      if (remaining > 0) {
        return NextResponse.json({
          message: `Invalid credentials. ${remaining} attempt(s) remaining.`,
        }, { status: 401 })
      } else {
        return NextResponse.json({
          message: `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes due to too many failed attempts.`,
        }, { status: 423 })
      }
    }

    const sessionId = crypto.randomUUID()
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null
    const userAgent = request.headers.get("user-agent") || null

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockoutUntil: null, refreshToken: sessionId, lastLogin: new Date() },
      }),
      prisma.userSession.create({
        data: {
          userId: user.id,
          ip,
          userAgent,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          entity: "USER",
          entityId: user.id,
          ip,
          userAgent,
        },
      }),
    ])

    const tokenPayload = { userId: user.id, email: user.email, role: user.role }
    const token = generateToken(tokenPayload)

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar, phone: user.phone },
      token,
      sessionId,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
