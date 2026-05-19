import prisma from './src/config/database'
import { getBlobService } from './src/services/upload'
import { BlobSASPermissions } from '@azure/storage-blob'

async function main() {
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  const service = getBlobService()
  const containerClient = service.getContainerClient(containerName)

  const blobPaths = [
    'analysis/31f81e68-21bd-447f-b21c-467cb7249224-50c24e12-8eb7-46ec-9fe9-d4f85770fee7.jpeg',
    'analysis/c35e8128-ada8-49cf-9644-182d72be5b6b-c8869c96-948a-47f6-932f-b4ed02725bc6.jpeg',
    'analysis/a4dc60d8-aa17-4f0e-b408-cbfbf880aced-90b1e5ca-699b-43ed-838f-e0f458d144b4.jpeg',
  ]

  const sasUrls: string[] = []
  for (const blobPath of blobPaths) {
    const blobClient = containerClient.getBlockBlobClient(blobPath)
    const sasUrl = await blobClient.generateSasUrl({
      startsOn: new Date(Date.now() - 2 * 60 * 1000),
      expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000),
      permissions: BlobSASPermissions.parse('r'),
    })
    sasUrls.push(sasUrl)
    console.log('Generated SAS for:', blobPath)
  }

  const obs = await prisma.observation.findFirst()
  if (!obs) {
    console.log('No observation found')
    return
  }

  const updated = await prisma.observation.update({
    where: { id: obs.id },
    data: { photos: sasUrls },
  })

  console.log('Updated observation:', updated.id)
  console.log('Photos count:', sasUrls.length)
}

main().catch(console.error)
