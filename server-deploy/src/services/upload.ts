import { BlobServiceClient } from '@azure/storage-blob'
import { config } from '../config'

let blobServiceClient: BlobServiceClient

export function getBlobService(): BlobServiceClient {
  if (!blobServiceClient) {
    const connectionString = config.azureStorage.connectionString
    if (!connectionString) {
      throw new Error('Azure Storage connection string not configured')
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
  }
  return blobServiceClient
}

export async function getUploadUrl(fileName: string, contentType: string): Promise<string> {
  const service = getBlobService()
  const containerClient = service.getContainerClient(config.azureStorage.containerName)
  const blockBlobClient = containerClient.getBlockBlobClient(fileName)

  await blockBlobClient.uploadBrowserData(Buffer.from(''), {
    blobHTTPHeaders: { blobContentType: contentType },
  })

  return blockBlobClient.url
}

export async function deleteBlob(url: string): Promise<void> {
  const service = getBlobService()
  const containerName = config.azureStorage.containerName
  const blobName = url.split(`${containerName}/`)[1]
  if (blobName) {
    const containerClient = service.getContainerClient(containerName)
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)
    await blockBlobClient.delete()
  }
}
