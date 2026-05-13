import bcrypt from 'bcrypt'
import 'dotenv/config'
import prisma from '../src/config/database'

const seedPassword = process.env.SEED_PASSWORD || 'SeedPassword2026!Secure'

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

  // Create species
  const species = await Promise.all([
    prisma.species.upsert({
      where: { scientificName: 'Scylla serrata' },
      update: {},
      create: {
        scientificName: 'Scylla serrata',
        commonName: 'Blue Mud Crab',
        description: 'The blue mud crab is one of the largest species of mud crab, found throughout the Indo-Pacific region.',
        keyFeatures: ['Blue coloration on carapace', 'Large chelipeds', 'Can reach 30cm carapace width'],
        images: ['https://example.com/scylla-serrata.jpg'],
        distributionZones: ['Malaysia', 'Thailand', 'Indonesia', 'Philippines', 'Australia'],
      },
    }),
    prisma.species.upsert({
      where: { scientificName: 'Scylla paramamosain' },
      update: {},
      create: {
        scientificName: 'Scylla paramamosain',
        commonName: 'Green Mud Crab',
        description: 'The green mud crab is a commercially important species found in estuaries and mangrove areas.',
        keyFeatures: ['Green coloration on carapace', 'Found in brackish water', 'Highly commercialized'],
        images: ['https://example.com/scylla-paramamosain.jpg'],
        distributionZones: ['Malaysia', 'Singapore', 'Indonesia', 'Vietnam', 'China'],
      },
    }),
    prisma.species.upsert({
      where: { scientificName: 'Scylla olivacea' },
      update: {},
      create: {
        scientificName: 'Scylla olivacea',
        commonName: 'Olive Mud Crab',
        description: 'The olive mud crab is a smaller species of mud crab with olive-green coloration.',
        keyFeatures: ['Olive-green coloration', 'Smaller size', 'Prefers muddy substrates'],
        images: ['https://example.com/scylla-olivacea.jpg'],
        distributionZones: ['Malaysia', 'Thailand', 'Myanmar', 'Bangladesh'],
      },
    }),
    prisma.species.upsert({
      where: { scientificName: 'Scylla tranquebarica' },
      update: {},
      create: {
        scientificName: 'Scylla tranquebarica',
        commonName: 'Tamil Mud Crab',
        description: 'The Tamil mud crab is the smallest of the Scylla species, with lighter coloration and a narrower carapace.',
        keyFeatures: ['Smallest Scylla species', 'Lighter coloration', 'Narrower carapace'],
        images: ['https://example.com/scylla-tranquebarica.jpg'],
        distributionZones: ['Malaysia', 'India', 'Sri Lanka', 'Bangladesh'],
      },
    }),
  ])
  console.log(`✅ Created ${species.length} species`)

  // Create sample observations
  const observations = await Promise.all([
    prisma.observation.create({
      data: {
        userId: citizen.id,
        speciesId: species[0].id,
        cw: 12.5,
        bw: 180.5,
        gender: 'MALE',
        maturationStatus: 'MATURE',
        lat: 5.4141,
        lng: 100.3288,
        locationMethod: 'GPS',
        photos: ['https://example.com/obs1.jpg'],
        notes: 'Healthy male specimen caught in mangrove area',
        status: 'APPROVED',
        validatedBy: researcher.id,
        validatedAt: new Date(),
      },
    }),
    prisma.observation.create({
      data: {
        userId: citizen.id,
        speciesId: species[1].id,
        cw: 8.2,
        bw: 95.3,
        gender: 'FEMALE',
        maturationStatus: 'IMMATURE',
        lat: 3.139,
        lng: 101.6869,
        locationMethod: 'GPS',
        photos: ['https://example.com/obs2.jpg'],
        notes: 'Small female specimen from Kuala Lumpur river mouth',
        status: 'PENDING',
      },
    }),
    prisma.observation.create({
      data: {
        userId: citizen.id,
        speciesId: species[2].id,
        cw: 15.1,
        bw: 245.8,
        gender: 'MALE',
        maturationStatus: 'MATURE',
        lat: 6.1184,
        lng: 102.2563,
        locationMethod: 'MANUAL',
        photos: ['https://example.com/obs3.jpg'],
        notes: 'Large male specimen from Perak mangroves',
        status: 'APPROVED',
        validatedBy: researcher.id,
        validatedAt: new Date(),
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
