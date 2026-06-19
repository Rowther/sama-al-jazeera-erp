import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

async function checkDatabaseConnection() {
  try {
    await prisma.$connect()
    console.log('[OK] Database connected successfully')
  } catch (err) {
    console.error('[FAIL] Database connection failed:', err instanceof Error ? err.message : err)
  }
}

async function checkEnvironment() {
  console.log('[INFO] NODE_ENV:', process.env.NODE_ENV || 'not set')
  console.log('[INFO] DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'MISSING')
  console.log('[INFO] JWT_SECRET:', process.env.JWT_SECRET ? 'set' : 'MISSING')
  console.log('[INFO] JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? 'set' : 'MISSING')
}

checkEnvironment()
checkDatabaseConnection()
