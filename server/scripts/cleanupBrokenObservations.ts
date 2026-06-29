import { config } from '../src/config'
import prisma from '../src/config/database'
import { createContainer, getPrisma } from '../src/services/container'
import admin from '../src/config/firebase'
import { getBlobService } from '../src/services/upload'

const BROKEN_OBSERVATION_IDS = [
  '2d8d6ffa-6e91-4692-8d6d-ded0561615bc',
  'd58d493c-ffb8-4921-a158-3e3cd9758ab6',
  'cfe6bb31-c98d-41b4-a808-d5aacd5a0a44',
  '1b5d925b-4a78-4997-ad94-9a225957c6ef',
  '14b66c3e-7a78-482e-b23d-87cca8f4adae',
  'e593a7fd-0fac-4da3-84ef-d93552174006',
  'f527b15b-8a19-48fe-8096-c68cebeb1c89',
  '4c2e0070-94be-4d5a-b2ad-d37379c04e7a',
  'c85690d7-9b14-4846-9702-cf048b4e3691',
  '57650381-cac8-46d6-873f-6881a0f1b74e',
  '24f8c55c-1a51-414e-a0fc-9e459d6fd3d1',
  '0c4df8e8-842d-407d-80fa-3755abc09ddb',
  '7794b524-4431-4c5b-8e56-c9d7814768e0',
  '778d65e5-6e32-47f0-a4a3-787f97db449f',
]

async function main() {
  process.env.NODE_ENV = 'production'
  createContainer(prisma, config, admin, getBlobService)
  const db = getPrisma()

  console.log(`\n--- Cleaning up ${BROKEN_OBSERVATION_IDS.length} broken observations ---\n`)

  let deleted = 0
  let skipped = 0

  for (const id of BROKEN_OBSERVATION_IDS) {
    try {
      const obs = await db.observation.findUnique({
        where: { id },
        select: { status: true },
      })

      if (!obs) {
        console.log(`  SKIPPED ${id} — already deleted`)
        skipped++
        continue
      }

      await db.observation.delete({
        where: { id },
      })

      console.log(`  DELETED ${id} (status: ${obs.status})`)
      deleted++
    } catch (err) {
      console.error(`  ERROR ${id}: ${err}`)
    }
  }

  console.log(`\n=== Cleanup Summary ===`)
  console.log(`Deleted: ${deleted}`)
  console.log(`Skipped: ${skipped}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
