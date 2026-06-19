import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { PrismaClient } from '@prisma/client'

async function main() {
  console.log('[init] Running prisma db push...')
  execSync('npx prisma db push', { stdio: 'inherit' })

  const prisma = new PrismaClient()
  try {
    const count = await prisma.user.count()
    if (count === 0) {
      console.log('[init] No users found, seeding database...')
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' })
    } else {
      console.log(`[init] ${count} users already exist, skipping seed.`)
    }
  } finally {
    await prisma.$disconnect()
  }

  console.log('[init] Starting server...')
  if (existsSync('server.js')) {
    execSync('node server.js', { stdio: 'inherit' })
  } else {
    execSync('next start', { stdio: 'inherit' })
  }
}

main().catch((err) => {
  console.error('[init] Fatal error:', err)
  process.exit(1)
})
