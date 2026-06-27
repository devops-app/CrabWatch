import { config } from '../src/config'
import prisma from '../src/config/database'
import { createContainer, getPrisma } from '../src/services/container'
import admin from '../src/config/firebase'
import { getBlobService } from '../src/services/upload'

async function main() {
  process.env.NODE_ENV = 'production'
  createContainer(prisma, config, admin, getBlobService)
  const db = getPrisma()

  const observations = await db.observation.findMany({
    select: {
      id: true,
      photos: true,
    },
  })

  const broken = observations.filter(obs => {
    const photos = obs.photos as string[]
    return Array.isArray(photos) && photos.some((p: string) => p.includes('/analysis/'))
  })

  console.log(`\nFound ${broken.length} observations with /analysis/ paths\n`)

  let updated = 0

  for (const obs of broken) {
    const photos = obs.photos as string[]
    const newPhotos = photos.map((url: string) =>
      url.includes('/analysis/') ? 'placeholder://missing' : url
    )

    if (JSON.stringify(newPhotos) !== JSON.stringify(photos)) {
      await db.observation.update({
        where: { id: obs.id },
        data: { photos: newPhotos },
      })
      console.log(`  REPLACED: observation ${obs.id}`)
      updated++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${broken.length - updated}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
