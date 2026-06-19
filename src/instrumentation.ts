import { prisma } from '@/lib/db'

export async function register() {
  console.log('=== Server Startup ===')
  console.log('[OK] Application code loaded successfully')

  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('[OK] Database query test passed')
  } catch (err) {
    console.error('[FAIL] Database query test failed:', err instanceof Error ? err.message : err)
  }

  console.log('=== Startup Complete ===')
}
