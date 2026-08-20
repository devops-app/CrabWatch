import bcrypt from 'bcryptjs'
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob'
import prisma from '../src/config/database'

const seedPassword = process.env.SEED_PASSWORD || 'Pa55w.rd'

/**
 * Upload local images to Azure Blob Storage and return SAS URLs.
 * Falls back to placeholder URLs if Azure Storage is not configured.
 */
async function uploadSeedImages(obsNumber: number): Promise<string[]> {
  const imagesDir = path.resolve(__dirname, '../../images/obs', String(obsNumber))

  if (!fs.existsSync(imagesDir)) {
    console.warn(`  ⚠️  Images directory not found: ${imagesDir}`)
    return [`placeholder://obs-${obsNumber}`]
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'

  if (!connectionString) {
    console.warn('  ⚠️  Azure Storage not configured — using placeholder URLs for seed images')
    const files = fs.readdirSync(imagesDir).filter((f) => f.match(/\.(jpg|jpeg|png|webp)$/i)).sort()
    return files.map((f) => `placeholder://obs-${obsNumber}/${f}`)
  }

  try {
    const service = BlobServiceClient.fromConnectionString(connectionString)
    const containerClient = service.getContainerClient(containerName)
    const files = fs.readdirSync(imagesDir).filter((f) => f.match(/\.(jpg|jpeg|png|webp)$/i)).sort()
    const sasUrls: string[] = []

    for (const file of files) {
      const filePath = path.join(imagesDir, file)
      const buffer = fs.readFileSync(filePath)
      const ext = path.extname(file).toLowerCase()
      const blobPath = `observations/seed/${obsNumber}/${file}`
      const blobClient = containerClient.getBlockBlobClient(blobPath)

      await blobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : 'image/webp' },
      })

      const sasUrl = await blobClient.generateSasUrl({
        startsOn: new Date(Date.now() - 2 * 60 * 1000),
        expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year for seed data
        permissions: BlobSASPermissions.parse('r'),
      })
      sasUrls.push(sasUrl)
    }

    console.log(`  📤 Uploaded ${sasUrls.length} images for observation ${obsNumber}`)
    return sasUrls
  } catch (err) {
    console.warn(`  ⚠️  Failed to upload images for observation ${obsNumber}:`, err instanceof Error ? err.message : err)
    return [`placeholder://obs-${obsNumber}`]
  }
}

if (process.env.NODE_ENV === 'production') {
  console.warn('WARNING: Running seed script in production environment')
}

async function main() {
  console.log('🌱 Starting database seed...')
  console.log(`ℹ️  Using seed password from SEED_PASSWORD env var or default`)

  const hashedPassword = await bcrypt.hash(seedPassword, 10)

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crabwatch.my' },
    update: {
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      firebaseUid: 'seed-admin-uid',
    },
    create: {
      name: 'Admin User',
      email: 'admin@crabwatch.my',
      password: hashedPassword,
      role: 'ADMIN',
      firebaseUid: 'seed-admin-uid',
    },
  })
  console.log('✅ Created admin user:', admin.email)

  // Create researcher user
  const researcher = await prisma.user.upsert({
    where: { email: 'researcher@crabwatch.my' },
    update: {
      password: hashedPassword,
      name: 'Dr. Crab Researcher',
      role: 'RESEARCHER',
      firebaseUid: 'seed-researcher-uid',
    },
    create: {
      name: 'Dr. Crab Researcher',
      email: 'researcher@crabwatch.my',
      password: hashedPassword,
      role: 'RESEARCHER',
      firebaseUid: 'seed-researcher-uid',
    },
  })
  console.log('✅ Created researcher user:', researcher.email)

  // Create citizen user
  const citizen = await prisma.user.upsert({
    where: { email: 'citizen@crabwatch.my' },
    update: {
      password: hashedPassword,
      name: 'Citizen Scientist',
      role: 'USER',
      firebaseUid: 'seed-citizen-uid',
    },
    create: {
      name: 'Citizen Scientist',
      email: 'citizen@crabwatch.my',
      password: hashedPassword,
      role: 'USER',
      firebaseUid: 'seed-citizen-uid',
    },
  })
  console.log('✅ Created citizen user:', citizen.email)

  // Create species (8 species: 4 swimming crabs + 4 mud crabs)
  const species = await Promise.all([
    // Swimming crabs
    prisma.species.upsert({
      where: { scientificName: 'Charybdis natator' },
      update: {},
      create: {
        scientificName: 'Charybdis natator',
        commonName: 'Crucifix Crab',
        description: 'A swimming crab species easily identified by the distinctive crucifix-shaped marking on its carapace. Commonly found in shallow coastal waters and mangrove areas.',
        keyFeatures: ['Crucifix-shaped marking on carapace', 'Swimming paddles on rear legs', 'Found in shallow coastal waters'],
        images: ['https://example.com/charybdis-natator.jpg'],
        distributionZones: ['Malaysia', 'Thailand', 'Indonesia', 'Philippines', 'Vietnam'],
      },
    }),
    prisma.species.upsert({
      where: { scientificName: 'Portunus pelagicus' },
      update: {},
      create: {
        scientificName: 'Portunus pelagicus',
        commonName: 'Blue Swimming Crab',
        description: 'A large and commercially important swimming crab with blue-green coloration. One of the most widely distributed swimming crabs in the Indo-Pacific.',
        keyFeatures: ['Blue-green carapace coloration', 'Large size up to 25cm width', 'Strong swimming ability'],
        images: ['https://example.com/portunus-pelagicus.jpg'],
        distributionZones: ['Malaysia', 'Thailand', 'Indonesia', 'Philippines', 'India', 'Australia'],
      },
    }),
    prisma.species.upsert({
      where: { scientificName: 'Charybdis longicollis' },
      update: {},
      create: {
        scientificName: 'Charybdis longicollis',
        commonName: 'Long-eyed Swimmer Crab',
        description: 'A swimming crab characterized by its elongated eye stalks. Found in estuarine and mangrove habitats across Southeast Asia.',
        keyFeatures: ['Elongated eye stalks', 'Mottled brown carapace', 'Estuarine and mangrove habitat'],
        images: ['https://example.com/charybdis-longicollis.jpg'],
        distributionZones: ['Malaysia', 'Singapore', 'Indonesia', 'Thailand', 'Vietnam'],
      },
    }),
    prisma.species.upsert({
      where: { scientificName: 'Charybdis feriatus' },
      update: {},
      create: {
        scientificName: 'Charybdis feriatus',
        commonName: 'Three-Spot Swimming Crab',
        description: 'A brightly colored swimming crab with three distinctive spots on its carapace. Known for its aggressive behavior and vivid coloration.',
        keyFeatures: ['Three distinctive spots on carapace', 'Bright red and white coloration', 'Aggressive territorial behavior'],
        images: ['https://example.com/charybdis-feriatus.jpg'],
        distributionZones: ['Malaysia', 'Thailand', 'Indonesia', 'Philippines', 'Singapore'],
      },
    }),
    // Mud crabs
    prisma.species.upsert({
      where: { scientificName: 'Scylla olivacea' },
      update: {},
      create: {
        scientificName: 'Scylla olivacea',
        commonName: 'Orange Mud Crab',
        description: 'A medium-sized mud crab with orange to olive-brown coloration. Commonly found in mangrove forests and muddy estuaries throughout Southeast Asia.',
        keyFeatures: ['Orange to olive-brown carapace', 'Medium size up to 18cm width', 'Prefers muddy substrates in mangroves'],
        images: ['https://example.com/scylla-olivacea.jpg'],
        distributionZones: ['Malaysia', 'Thailand', 'Myanmar', 'Bangladesh', 'Indonesia'],
      },
    }),
    prisma.species.upsert({
      where: { scientificName: 'Scylla serrata' },
      update: {},
      create: {
        scientificName: 'Scylla serrata',
        commonName: 'Yellow Mud Crab',
        description: 'One of the largest mud crab species with yellow to blue-green coloration. Highly prized in aquaculture and commercial fisheries across the Indo-Pacific.',
        keyFeatures: ['Yellow to blue-green carapace', 'Large size up to 30cm width', 'Highly commercialized species'],
        images: ['https://example.com/scylla-serrata.jpg'],
        distributionZones: ['Malaysia', 'Thailand', 'Indonesia', 'Philippines', 'Australia', 'India'],
      },
    }),
    prisma.species.upsert({
      where: { scientificName: 'Scylla tranquebarica' },
      update: {},
      create: {
        scientificName: 'Scylla tranquebarica',
        commonName: 'Purple Mud Crab',
        description: 'The smallest of the major Scylla mud crab species with purple to grey coloration and a narrower carapace. Found in mangrove and estuarine environments.',
        keyFeatures: ['Purple to grey coloration', 'Smallest Scylla species', 'Narrower carapace shape'],
        images: ['https://example.com/scylla-tranquebarica.jpg'],
        distributionZones: ['Malaysia', 'India', 'Sri Lanka', 'Bangladesh', 'Thailand'],
      },
    }),
    prisma.species.upsert({
      where: { scientificName: 'Scylla paramamosain' },
      update: {},
      create: {
        scientificName: 'Scylla paramamosain',
        commonName: 'Giant Mud Crab',
        description: 'The largest and most commercially valuable mud crab species. Known for its green coloration and robust build, found in brackish water estuaries and mangroves.',
        keyFeatures: ['Green coloration on carapace', 'Largest mud crab species up to 35cm', 'Found in brackish water estuaries'],
        images: ['https://example.com/scylla-paramamosain.jpg'],
        distributionZones: ['Malaysia', 'Singapore', 'Indonesia', 'Vietnam', 'China', 'Thailand'],
      },
    }),
  ])
  console.log(`✅ Created ${species.length} species`)

  // Create sample observations with real images from images/obs/
  console.log('\n📸 Uploading seed observation images...')
  const obsImages = await Promise.all([
    uploadSeedImages(1),
    uploadSeedImages(2),
    uploadSeedImages(3),
    uploadSeedImages(4),
    uploadSeedImages(5),
  ])

  const observations = await Promise.all([
    prisma.observation.upsert({
      where: { id: 'seed-obs-001' },
      update: {},
      create: {
        id: 'seed-obs-001',
        userId: citizen.id,
        speciesId: species[5].id, // Yellow Mud Crab (Scylla serrata)
        cw: 12.5,
        bw: 180.5,
        gender: 'MALE',
        maturationStatus: 'MATURE',
        lat: 5.4141,
        lng: 100.3288,
        locationMethod: 'GPS',
        photos: obsImages[0],
        detectedCoin: 'Third Series 50 sen',
        notes: 'Healthy male Yellow Mud Crab caught in Penang mangrove area. Dorsal view shows characteristic yellow-green carapace coloration.',
        status: 'APPROVED',
        validatedBy: researcher.id,
        validatedAt: new Date(),
      },
    }),
    prisma.observation.upsert({
      where: { id: 'seed-obs-002' },
      update: {},
      create: {
        id: 'seed-obs-002',
        userId: citizen.id,
        speciesId: species[0].id, // Crucifix Crab (Charybdis natator)
        cw: 8.2,
        bw: 95.3,
        gender: 'FEMALE',
        maturationStatus: 'IMMATURE',
        lat: 3.139,
        lng: 101.6869,
        locationMethod: 'GPS',
        photos: obsImages[1],
        detectedCoin: 'Third Series 20 sen',
        notes: 'Small female Crucifix Crab from Kuala Lumpur river mouth. Distinctive crucifix marking visible on carapace.',
        status: 'PENDING',
      },
    }),
    prisma.observation.upsert({
      where: { id: 'seed-obs-003' },
      update: {},
      create: {
        id: 'seed-obs-003',
        userId: citizen.id,
        speciesId: species[7].id, // Giant Mud Crab (Scylla paramamosain)
        cw: 15.1,
        bw: 245.8,
        gender: 'MALE',
        maturationStatus: 'MATURE',
        lat: 6.1184,
        lng: 102.2563,
        locationMethod: 'MANUAL',
        photos: obsImages[2],
        detectedCoin: 'Third Series 50 sen',
        notes: 'Large male Giant Mud Crab from Perak mangroves. Robust build with green coloration typical of the species.',
        status: 'APPROVED',
        validatedBy: researcher.id,
        validatedAt: new Date(),
      },
    }),
    prisma.observation.upsert({
      where: { id: 'seed-obs-004' },
      update: {},
      create: {
        id: 'seed-obs-004',
        userId: citizen.id,
        speciesId: species[1].id, // Blue Swimming Crab (Portunus pelagicus)
        cw: 10.8,
        bw: 142.0,
        gender: 'MALE',
        maturationStatus: 'MATURE',
        lat: 1.4779,
        lng: 103.7611,
        locationMethod: 'GPS',
        photos: obsImages[3],
        detectedCoin: 'Third Series 10 sen',
        notes: 'Blue Swimming Crab found in Johor coastal waters. Strong swimming paddles visible on rear legs.',
        status: 'PENDING',
      },
    }),
    prisma.observation.upsert({
      where: { id: 'seed-obs-005' },
      update: {},
      create: {
        id: 'seed-obs-005',
        userId: citizen.id,
        speciesId: species[3].id, // Three-Spot Swimming Crab (Charybdis feriatus)
        cw: 7.5,
        bw: 68.2,
        gender: 'FEMALE',
        maturationStatus: 'IMMATURE',
        lat: 5.7598,
        lng: 100.3998,
        locationMethod: 'GPS',
        photos: obsImages[4],
        detectedCoin: 'Second Series 5 sen',
        notes: 'Three-Spot Swimming Crab from Kedah estuary. Bright red and white coloration with three distinctive spots on carapace.',
        status: 'REJECTED',
        validatedBy: researcher.id,
        validatedAt: new Date(),
        rejectionReason: 'Photo quality insufficient for species confirmation - consider retaking with better lighting.',
      },
    }),
  ])
  console.log(`✅ Created ${observations.length} observations`)

  console.log('🎉 Database seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
