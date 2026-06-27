import { PrismaClient } from '@prisma/client'
import { config } from '../src/config'
import prisma from '../src/config/database'
import { createContainer, getPrisma } from '../src/services/container'
import admin from '../src/config/firebase'
import { getBlobService } from '../src/services/upload'

async function main() {
  process.env.NODE_ENV = 'production'
  createContainer(prisma, config, admin, getBlobService)
  const db = getPrisma()

  const observations = await prisma.observation.findMany({
    select: {
      id: true,
      userId: true,
      photos: true,
      status: true,
      createdAt: true,
    },
  })

  console.log(`\nTotal observations: ${observations.length}\n`)

  let analysisPathCount = 0
  let observationPathCount = 0
  let exampleComCount = 0
  let placeholderCount = 0
  let mixedCount = 0

  const brokenObservations: Array<{ id: string; userId: string; status: string; photos: any; createdAt: Date }> = []

  for (const obs of observations) {
    const photos = obs.photos as string[]
    if (!photos || !Array.isArray(photos)) continue

    const hasAnalysis = photos.some((p: string) => p.includes('/analysis/'))
    const hasObservation = photos.some((p: string) => p.includes('/observations/'))
    const hasExample = photos.some((p: string) => p.includes('example.com'))
    const hasPlaceholder = photos.some((p: string) => p.includes('placeholder://'))

    if (hasAnalysis) analysisPathCount++
    if (hasObservation) observationPathCount++
    if (hasExample) exampleComCount++
    if (hasPlaceholder) placeholderCount++
    if (hasAnalysis || hasPlaceholder) {
      mixedCount++
      brokenObservations.push(obs)
    }
  }

  console.log('=== Summary ===')
  console.log(`Observations with /analysis/ paths: ${analysisPathCount}`)
  console.log(`Observations with /observations/ paths: ${observationPathCount}`)
  console.log(`Observations with example.com: ${exampleComCount}`)
  console.log(`Observations with placeholder://missing: ${placeholderCount}`)
  console.log(`Observations with broken/fallback paths: ${mixedCount}`)

  if (brokenObservations.length > 0) {
    console.log(`\n=== Broken Observations ===`)
    for (const obs of brokenObservations) {
      const photos = obs.photos as string[]
      console.log(`\nID: ${obs.id}`)
      console.log(`  User: ${obs.userId}`)
      console.log(`  Status: ${obs.status}`)
      console.log(`  Created: ${obs.createdAt.toISOString().slice(0, 19)}`)
      console.log(`  Photos:`)
      for (const photo of photos) {
        const type = photo.includes('/analysis/') ? '[ANALYSIS]' :
                     photo.includes('/observations/') ? '[OBSERVATION]' :
                     photo.includes('example.com') ? '[EXAMPLE]' :
                     photo.includes('placeholder') ? '[MISSING]' : '[OTHER]'
        console.log(`    ${type} ${photo.split('?')[0].slice(0, 120)}`)
      }
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
