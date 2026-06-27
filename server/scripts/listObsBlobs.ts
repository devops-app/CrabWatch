import { BlobServiceClient } from '@azure/storage-blob'
import { config } from 'dotenv'
config({ path: './.env' })

async function main() {
  const svc = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!)
  const cc = svc.getContainerClient(process.env.AZURE_STORAGE_CONTAINER!)
  const all: string[] = []
  for await (const b of cc.listBlobsFlat()) {
    all.push(b.name)
  }
  console.log('Total blobs:', all.length)
  const obsHeic = all.filter(n => n.startsWith('observations/') && (n.toLowerCase().endsWith('.heic') || n.toLowerCase().endsWith('.heif')))
  console.log('HEIC in observations:', obsHeic.length)
  obsHeic.forEach(x => console.log('  ' + x))
  const obsAll = all.filter(n => n.startsWith('observations/'))
  console.log('All in observations:', obsAll.length)
  const exts: Record<string, number> = {}
  obsAll.forEach(n => {
    const ext = n.split('.').pop()?.toLowerCase() || '(none)'
    exts[ext] = (exts[ext] || 0) + 1
  })
  console.log('Extensions:', exts)
}
main()
