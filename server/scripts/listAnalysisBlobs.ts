require('dotenv').config({ path: '.env' });
const { BlobServiceClient } = require('@azure/storage-blob');
const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
const container = process.env.AZURE_STORAGE_CONTAINER;
const svc = BlobServiceClient.fromConnectionString(connStr);
const cc = svc.getContainerClient(container);
const obsIds = ['a61a5738-b2c4-46ff-b31f-e136577bbe65', 'a944b293-ba32-4626-a47f-a03fc43a1360', '3b588ca4-9b5b-467c-8ddc-58a47478c632'];
(async () => {
  let list = cc.listBlobsFlat();
  let results = [];
  for await (const b of list) {
    if (b.name.startsWith('analysis/') && obsIds.some(id => b.name.includes(id))) {
      results.push(b.name);
    }
  }
  results.sort();
  console.log('Total blobs found:', results.length);
  results.forEach(r => console.log(r));
})();
