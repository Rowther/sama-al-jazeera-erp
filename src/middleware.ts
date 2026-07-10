import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limiter'

function decodeJWTPayload(token: string): { userId: string; email: string; role: string } | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return { userId: decoded.userId, email: decoded.email, role: decoded.role }
  } catch {
    return null
  }
}

const LOGGED_ACTIONS: Record<string, string> = {
  GET: "VIEW",
  POST: "CREATE",
  PUT: "UPDATE",
  PATCH: "UPDATE",
  DELETE: "DELETE",
}

function shouldLog(pathname: string): boolean {
  if (!pathname.startsWith('/api')) return false
  if (pathname === '/api/_log') return false
  if (pathname === '/api/auth/login') return false
  if (pathname === '/api/auth/logout') return false
  if (pathname.startsWith('/api/auth/me')) return false
  if (pathname === '/api/health') return false
  if (pathname.startsWith('/api/uploads')) return false
  return true
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/uploads')

  if (isStatic) return NextResponse.next()

  const response = NextResponse.next()

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (pathname.startsWith('/api')) {
    const ip = getClientIp(request)
    const result = rateLimit(`api:${ip}`)

    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    response.headers.set('X-RateLimit-Reset', String(result.resetAt))

    if (!result.allowed) {
      return new NextResponse(JSON.stringify({ message: 'Too many requests, please try again later' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      })
    }

    if (shouldLog(pathname)) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const user = decodeJWTPayload(token)
        if (user) {
          const entity = pathname.replace(/^\/api\//, '').split('/')[0].toUpperCase()
          const method = request.method
          const action = LOGGED_ACTIONS[method] || method

          const logData = {
            userId: user.userId,
            action,
            entity,
            entityId: pathname,
          }

          const logUrl = new URL('/api/_log', request.url).toString()
          fetch(logUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData),
          }).catch(() => {})
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
