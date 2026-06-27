import { config } from '../src/config'
import prisma from '../src/config/database'
import { createContainer } from '../src/services/container'
import admin from '../src/config/firebase'
import { getBlobService } from '../src/services/upload'

async function main() {
  process.env.NODE_ENV = 'production'
  createContainer(prisma, config, admin, getBlobService)
  const all = await prisma.observation.findMany({ select: { id: true, userId: true, createdAt: true, uploadSessionId: true, photos: true } })
  for (const o of all) {
    const arr = o.photos as string[]
    if (Array.isArray(arr) && arr.some((p: string) => p.includes('placeholder'))) {
      console.log('---', o.id)
      console.log('  userId:', o.userId)
      console.log('  session:', o.uploadSessionId)
      console.log('  created:', o.createdAt.toISOString().slice(0, 19))
      console.log('  photos:')
      for (let i = 0; i < arr.length; i++) {
        console.log(`    [${i}]`, arr[i]?.split('?')[0]?.slice(0, 150))
      }
    }
  }
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
