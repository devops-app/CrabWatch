/**
 * convertHeicToJpg.ts
 *
 * Downloads HEIC blobs from Azure Storage, converts them to JPEG using sharp,
 * re-uploads as .jpg, and updates observation photos in the database.
 */
import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob'
import { PrismaClient } from '@prisma/client'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const heicConvert = require('heic-convert')
import { config } from 'dotenv'

config({ path: './.env' })

const prisma = new PrismaClient()
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
const svc = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!)
const containerClient = svc.getContainerClient(containerName)

function extractBlobPath(url: string): string | null {
  const afterContainer = url.split(`${containerName}/`)
  if (afterContainer.length < 2) return null
  return decodeURIComponent(afterContainer.slice(1).join('/').split('?')[0])
}

function blobPathToJpgPath(blobPath: string): string {
  return blobPath.replace(/\.(heic|heif)$/i, '.jpg')
}

async function downloadBlob(blobPath: string): Promise<Buffer> {
  const blobClient = containerClient.getBlockBlobClient(blobPath)
  const download = await blobClient.download()
  const chunks: Buffer[] = []
  for await (const chunk of download.readableStreamBody!) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  const result = await heicConvert({
    buffer,
    format: 'JPEG',
    quality: 0.92,
  })
  return Buffer.from(result)
}

async function uploadJpeg(blobPath: string, jpegBuffer: Buffer): Promise<string> {
  const blobClient = containerClient.getBlockBlobClient(blobPath)
  await blobClient.upload(jpegBuffer, jpegBuffer.length, {
    blobHTTPHeaders: { blobContentType: 'image/jpeg' },
  })
  const sasUrl = await blobClient.generateSasUrl({
    startsOn: new Date(Date.now() - 2 * 60 * 1000),
    expiresOn: new Date(Date.now() + 60 * 60 * 1000),
    permissions: BlobSASPermissions.parse('r'),
  })
  return sasUrl
}

interface HeicObservation {
  id: string
  photos: string[]
}

async function main() {
  console.log('Fetching all observations...')
  const observations = await prisma.observation.findMany({
    select: { id: true, photos: true },
  })

  console.log(`Total observations: ${observations.length}`)

  // Find observations with HEIC URLs
  const heicObs: { obs: HeicObservation; heicUrls: string[] }[] = []
  const allHeicUrls = new Set<string>()

  for (const obs of observations) {
    const photos = (obs.photos as any[]) || []
    const heicUrls = photos.filter((url: string) =>
      typeof url === 'string' && /\.(heic|heif)\?/i.test(url)
    )
    if (heicUrls.length > 0) {
      heicObs.push({ obs: { id: obs.id, photos: photos as string[] }, heicUrls })
      heicUrls.forEach(u => allHeicUrls.add(u))
    }
  }

  console.log(`Observations with HEIC photos: ${heicObs.length}`)
  console.log(`Unique HEIC URLs: ${allHeicUrls.size}`)

  // Report data
  const reportLines: string[] = []
  reportLines.push('# HEIC Observations Report')
  reportLines.push('')
  reportLines.push(`**Generated**: ${new Date().toISOString()}`)
  reportLines.push(`**Observations with HEIC photos**: ${heicObs.length}`)
  reportLines.push(`**Total HEIC images**: ${allHeicUrls.size}`)
  reportLines.push('')
  reportLines.push('## Observations')
  reportLines.push('')

  let totalConverted = 0
  let totalFailed = 0

  for (const { obs, heicUrls } of heicObs) {
    reportLines.push(`### Observation: ${obs.id}`)
    reportLines.push(`- **Link**: https://crabwatch-web.azurewebsites.net/en/dashboard/observation/${obs.id}`)
    reportLines.push(`- **HEIC photos**: ${heicUrls.length}`)
    reportLines.push('')

    const newPhotos = [...(obs.photos as any[]) || []]

    for (let i = 0; i < newPhotos.length; i++) {
      const url = newPhotos[i]
      if (typeof url !== 'string' || !/\.(heic|heif)\?/i.test(url)) continue

      const blobPath = extractBlobPath(url)
      if (!blobPath) {
        console.log(`  [SKIP] No blob path for: ${url}`)
        totalFailed++
        reportLines.push(`  - [SKIP] Index ${i}: no blob path`)
        continue
      }

      const jpgPath = blobPathToJpgPath(blobPath)

      try {
        console.log(`  Converting ${blobPath} -> ${jpgPath}`)
        const heicBuffer = await downloadBlob(blobPath)
        const jpegBuffer = await convertHeicToJpeg(heicBuffer)
        const newSasUrl = await uploadJpeg(jpgPath, jpegBuffer)

        // Update DB array with new URL (keeping SAS token fresh)
        newPhotos[i] = newSasUrl
        totalConverted++
        reportLines.push(`  - [OK] Index ${i}: ${blobPath} -> ${jpgPath}`)
      } catch (err: any) {
        console.error(`  [FAIL] ${blobPath}: ${err.message}`)
        totalFailed++
        reportLines.push(`  - [FAIL] Index ${i}: ${err.message}`)
      }
    }

    // Update DB if any photos changed for this observation
    const obsChanged = newPhotos.some((p: string, idx: number) => p !== obs.photos[idx])
    if (obsChanged) {
      try {
        await prisma.observation.update({
          where: { id: obs.id },
          data: { photos: newPhotos },
        })
        console.log(`  Updated observation ${obs.id}`)
      } catch (err: any) {
        console.error(`  [DB FAIL] ${obs.id}: ${err.message}`)
      }
    }

    reportLines.push('')
  }

  reportLines.push('## Summary')
  reportLines.push('')
  reportLines.push(`| Metric | Count |`)
  reportLines.push(`|--------|-------|`)
  reportLines.push(`| Observations with HEIC | ${heicObs.length} |`)
  reportLines.push(`| Successfully converted | ${totalConverted} |`)
  reportLines.push(`| Failed | ${totalFailed} |`)
  reportLines.push('')

  // Write report
  const fs = await import('fs')
  fs.writeFileSync('../heic-observations.md', reportLines.join('\n'), 'utf8')
  console.log(`\nReport written to ../heic-observations.md`)
  console.log(`Converted: ${totalConverted}, Failed: ${totalFailed}`)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
