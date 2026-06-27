import { config } from '../src/config'
import prisma from '../src/config/database'
import { createContainer, getPrisma } from '../src/services/container'
import admin from '../src/config/firebase'
import { getBlobService } from '../src/services/upload'
import { BlobSASPermissions } from '@azure/storage-blob'

interface AnalysisBlob {
  name: string
  userId: string
  date: string
  sessionId: string
  index: number
  ext: string
}

interface BrokenObs {
  id: string
  userId: string
  createdAt: Date
  photos: unknown
}

async function main() {
  process.env.NODE_ENV = 'production'
  createContainer(prisma, config, admin, getBlobService)
  const db = getPrisma()
  const service = getBlobService()
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  const containerClient = service.getContainerClient(containerName)

  // --- Pass 1: List all blobs in /analysis/ ---
  console.log('--- Scanning /analysis/ folder ---')
  const blobs: AnalysisBlob[] = []
  for await (const blob of containerClient.listBlobsFlat({ prefix: 'analysis/' })) {
    const parts = blob.name.split('/')
    if (parts.length >= 4) {
      const userId = parts[1]
      const date = parts[2]
      const filename = parts[3]
      const match = filename.match(/^(.+)-(\d+)\.(.+)$/)
      if (match) {
        blobs.push({
          name: blob.name,
          userId,
          date,
          sessionId: match[1],
          index: parseInt(match[2], 10),
          ext: match[3],
        })
      }
    }
  }
  console.log(`  Found ${blobs.length} blobs in /analysis/\n`)

  // Group blobs by userId + date, sort by session ID then index
  const blobGroups = new Map<string, AnalysisBlob[]>()
  for (const blob of blobs) {
    const key = `${blob.userId}||${blob.date}`
    if (!blobGroups.has(key)) blobGroups.set(key, [])
    blobGroups.get(key)!.push(blob)
  }
  for (const [, groupBlobs] of blobGroups) {
    groupBlobs.sort((a, b) => a.sessionId.localeCompare(b.sessionId) || a.index - b.index)
  }

  // --- Pass 2: Find broken observations ---
  const observations = await db.observation.findMany({
    select: {
      id: true,
      userId: true,
      createdAt: true,
      photos: true,
    },
  })

  const broken = observations.filter(obs => {
    const photos = obs.photos as string[]
    return Array.isArray(photos) && photos.some((p: string) => p.includes('placeholder://'))
  }) as BrokenObs[]

  console.log(`  Found ${broken.length} observations with placeholder paths\n`)

  // Group observations by userId + date, sort by createdAt
  const obsGroups = new Map<string, BrokenObs[]>()
  for (const obs of broken) {
    const obsDate = obs.createdAt.toISOString().slice(0, 10)
    const key = `${obs.userId}||${obsDate}`
    if (!obsGroups.has(key)) obsGroups.set(key, [])
    obsGroups.get(key)!.push(obs)
  }
  for (const [, groupObs] of obsGroups) {
    groupObs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  // --- Pass 3: Match blobs to observations ---
  type CopyJob = {
    sourceBlobName: string
    obsId: string
    userId: string
    photoIndex: number
    ext: string
  }

  const allCopyJobs: CopyJob[] = []

  for (const [key, groupObs] of obsGroups) {
    const groupBlobs = blobGroups.get(key) || []
    if (groupBlobs.length === 0) {
      console.log(`  No matching blobs for group ${key}`)
      continue
    }

    // Assign blobs to observations in chronological order
    let blobIdx = 0
    for (const obs of groupObs) {
      const photos = obs.photos as string[]
      const placeholderIndices = photos
        .map((p: string, i: number) => (p.includes('placeholder://') ? i : -1))
        .filter((i: number) => i !== -1)

      for (const photoIdx of placeholderIndices) {
        if (blobIdx >= groupBlobs.length) break
        const blob = groupBlobs[blobIdx]
        allCopyJobs.push({
          sourceBlobName: blob.name,
          obsId: obs.id,
          userId: obs.userId,
          photoIndex: photoIdx,
          ext: blob.ext,
        })
        blobIdx++
      }
      if (blobIdx >= groupBlobs.length) break
    }
  }

  console.log(`  Matched ${allCopyJobs.length} source blobs\n`)

  if (allCopyJobs.length === 0) {
    console.log('  No blobs to copy. Exiting.')
    await prisma.$disconnect()
    return
  }

  // --- Pass 4: Copy all blobs ---
  console.log('\n--- Copying blobs ---')
  const dateStr = new Date().toISOString().slice(0, 10)
  const extToType: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
  }

  type CopyResult = {
    obsId: string
    photoIndex: number
    destBlobName: string
    sasUrl: string
    sourceBlobName: string
  }

  const copyResults: CopyResult[] = []

  for (const job of allCopyJobs) {
    try {
      const sourceBlobClient = containerClient.getBlockBlobClient(job.sourceBlobName)
      const destBlobName = `observations/${job.userId}/${dateStr}/${job.obsId}-${job.photoIndex}.${job.ext}`
      const destBlobClient = containerClient.getBlockBlobClient(destBlobName)

      const download = await sourceBlobClient.download()
      const chunks: Buffer[] = []
      for await (const chunk of download.readableStreamBody!) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      const buffer = Buffer.concat(chunks)

      const contentType = extToType[job.ext.toLowerCase()] || 'image/jpeg'
      await destBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: contentType },
      })

      const sasUrl = await destBlobClient.generateSasUrl({
        startsOn: new Date(Date.now() - 2 * 60 * 1000),
        expiresOn: new Date(Date.now() + 60 * 60 * 1000),
        permissions: BlobSASPermissions.parse('r'),
      })

      copyResults.push({
        obsId: job.obsId,
        photoIndex: job.photoIndex,
        destBlobName,
        sasUrl,
        sourceBlobName: job.sourceBlobName,
      })
      console.log(`  COPIED: ${job.sourceBlobName} -> ${destBlobName}`)
    } catch (err) {
      console.log(`  ERROR copying ${job.sourceBlobName}: ${err}`)
    }
  }

  // --- Pass 5: Update DB ---
  console.log('\n--- Updating observations ---')
  let fixed = 0
  let partial = 0
  let failed = 0

  for (const obs of broken) {
    const photos = [...(obs.photos as string[])]
    let changed = false

    for (const result of copyResults) {
      if (result.obsId === obs.id && photos[result.photoIndex]?.includes('placeholder://')) {
        photos[result.photoIndex] = result.sasUrl
        changed = true
      }
    }

    if (changed) {
      await db.observation.update({
        where: { id: obs.id },
        data: { photos },
      })
      const remainingPlaceholders = photos.filter((p: string) => p.includes('placeholder://')).length
      if (remainingPlaceholders > 0) {
        console.log(`  PARTIAL observation ${obs.id} (${remainingPlaceholders} placeholders remain)`)
        partial++
      } else {
        console.log(`  FIXED observation ${obs.id}`)
        fixed++
      }
    } else {
      const remainingPlaceholders = photos.filter((p: string) => p.includes('placeholder://')).length
      console.log(`  FAILED observation ${obs.id} (${remainingPlaceholders} placeholders remain)`)
      failed++
    }
  }

  // --- Pass 6: Cleanup source blobs ---
  console.log('\n--- Cleaning up source blobs ---')
  const cleanedSources = new Set(copyResults.map(r => r.sourceBlobName))
  for (const sourceBlobName of cleanedSources) {
    try {
      await containerClient.getBlockBlobClient(sourceBlobName).delete()
      console.log(`  CLEANED: ${sourceBlobName}`)
    } catch {
      console.log(`  CLEANUP FAILED: ${sourceBlobName}`)
    }
  }

  console.log(`\n=== Migration Summary ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Partial: ${partial}`)
  console.log(`Failed: ${failed}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
