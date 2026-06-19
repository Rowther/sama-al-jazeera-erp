import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required')
}

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

export function verifyRefreshToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request)
  if (!token) return null
  try {
    return verifyToken(token)
  } catch {
    return null
  }
}

export function requireAuth(
  request: NextRequest,
  allowedRoles?: string[]
): { payload: JWTPayload; error: Response | null } {
  const payload = getUserFromRequest(request)
  if (!payload) {
    return {
      payload: null as unknown as JWTPayload,
      error: Response.json({ message: 'Unauthorized' }, { status: 401 })
    }
  }
  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    return {
      payload,
      error: Response.json({ message: 'Forbidden: insufficient permissions' }, { status: 403 })
    }
  }
  return { payload, error: null }
}
