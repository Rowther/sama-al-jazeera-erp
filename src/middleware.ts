import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limiter'

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
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
