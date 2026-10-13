/**
 * recoverAnalysisPhotos.ts
 *
 * Repairs observations whose photos still reference the temporary /analysis/
 * staging folder. For each such photo URL the exact source blob name is
 * extracted, its existence in Azure is checked, and (in --execute mode) it is
 * copied to the permanent /observations/ folder and the DB updated.
 *
 * Unlike fixAnalysisPaths.ts (which matches blobs by userId+date heuristically
 * and only targets placeholder:// URLs), this script uses the exact blob path
 * stored on the observation, so it never mis-assigns a photo.
 *
 * Usage:
 *   npx ts-node scripts/recoverAnalysisPhotos.ts            # DRY RUN (default)
 *   npx ts-node scripts/recoverAnalysisPhotos.ts --execute  # actually copy + update DB
 *
 * Dry run reports, per observation, how many /analysis/ photos are recoverable
 * (source blob still exists) vs unrecoverable (source blob deleted).
 */
import { config } from '../src/config'
import prisma from '../src/config/database'
import { createContainer, getPrisma } from '../src/services/container'
import admin from '../src/config/firebase'
import { getBlobService } from '../src/services/upload'
import { BlobSASPermissions, BlockBlobClient } from '@azure/storage-blob'

const EXECUTE = process.argv.includes('--execute')
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'

const extToType: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
}

/** Extract the blob name (path after the container) from a full blob URL. */
function extractBlobName(url: string): string | null {
  const marker = `/${CONTAINER}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const tail = url.slice(idx + marker.length)
  return decodeURIComponent(tail.split('?')[0]) || null
}

async function main() {
  process.env.NODE_ENV = 'production'
  createContainer(prisma, config, admin, getBlobService)
  const db = getPrisma()
  const service = getBlobService()
  const containerClient = service.getContainerClient(CONTAINER)

  console.log(`Mode: ${EXECUTE ? 'EXECUTE (will copy + update DB)' : 'DRY RUN (no changes)'}`)
  console.log(`Container: ${CONTAINER}\n`)

  // Find every observation that has at least one /analysis/ photo URL.
  const observations = await db.observation.findMany({
    select: { id: true, userId: true, createdAt: true, photos: true },
  })

  const broken = observations.filter((obs) => {
    const photos = obs.photos as string[]
    return Array.isArray(photos) && photos.some((p: string) => p.includes('/analysis/'))
  })

  console.log(`Observations with /analysis/ photos: ${broken.length}\n`)

  let totalAnalysisPhotos = 0
  let recoverable = 0
  let unrecoverable = 0
  let copied = 0
  let copyFailed = 0

  // Per-observation results for the DB update pass.
  const updates: { obsId: string; photos: string[] }[] = []

  for (const obs of broken) {
    const photos = [...(obs.photos as string[])]
    let obsRecoverable = 0
    let obsUnrecoverable = 0
    let changed = false

    for (let i = 0; i < photos.length; i++) {
      const url = photos[i]
      if (!url || !url.includes('/analysis/')) continue
      totalAnalysisPhotos++

      const sourceBlobName = extractBlobName(url)
      if (!sourceBlobName) {
        unrecoverable++
        obsUnrecoverable++
        continue
      }

      const sourceClient: BlockBlobClient = containerClient.getBlockBlobClient(sourceBlobName)
      let exists = false
      try {
        exists = await sourceClient.exists()
      } catch {
        exists = false
      }

      if (!exists) {
        // Source blob was deleted by the TTL cleanup — unrecoverable.
        unrecoverable++
        obsUnrecoverable++
        continue
      }

      recoverable++
      obsRecoverable++

      if (EXECUTE) {
        try {
          const dateStr = obs.createdAt.toISOString().slice(0, 10)
          const ext = sourceBlobName.split('.').pop() || 'jpg'
          const destBlobName = `observations/${obs.userId}/${dateStr}/${obs.id}-${i}.${ext}`
          const destClient = containerClient.getBlockBlobClient(destBlobName)

          const download = await sourceClient.download()
          const chunks: Buffer[] = []
          for await (const chunk of download.readableStreamBody!) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          const buffer = Buffer.concat(chunks)

          const contentType = extToType[ext.toLowerCase()] || 'image/jpeg'
          await destClient.upload(buffer, buffer.length, {
            blobHTTPHeaders: { blobContentType: contentType },
          })

          const sasUrl = await destClient.generateSasUrl({
            startsOn: new Date(Date.now() - 2 * 60 * 1000),
            expiresOn: new Date(Date.now() + 60 * 60 * 1000),
            permissions: BlobSASPermissions.parse('r'),
          })

          photos[i] = sasUrl
          changed = true
          copied++
        } catch (err) {
          copyFailed++
          console.log(`  COPY FAILED ${sourceBlobName}: ${err}`)
        }
      }
    }

    if (EXECUTE && changed) {
      updates.push({ obsId: obs.id, photos })
    }

    console.log(
      `  ${obs.id}  recoverable=${obsRecoverable}  unrecoverable=${obsUnrecoverable}`
    )
  }

  // Apply DB updates (execute mode only).
  if (EXECUTE && updates.length > 0) {
    console.log(`\n--- Updating ${updates.length} observations in DB ---`)
    for (const u of updates) {
      await db.observation.update({ where: { id: u.obsId }, data: { photos: u.photos } })
    }
    console.log(`  Updated ${updates.length} observations.\n`)
  }

  console.log('=== Summary ===')
  console.log(`Observations with /analysis/ photos : ${broken.length}`)
  console.log(`Total /analysis/ photos             : ${totalAnalysisPhotos}`)
  console.log(`  Recoverable (source blob exists)  : ${recoverable}`)
  console.log(`  Unrecoverable (source deleted)    : ${unrecoverable}`)
  if (EXECUTE) {
    console.log(`  Copied to /observations/          : ${copied}`)
    console.log(`  Copy failures                     : ${copyFailed}`)
  } else {
    console.log('\nDry run only. Re-run with --execute to copy recoverable photos and update the DB.')
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
