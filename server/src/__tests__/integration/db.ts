import bcrypt from 'bcryptjs'
import prisma from '../../config/database'

export interface TestUser {
  id: string
  email: string
  password: string
  role: 'USER' | 'RESEARCHER' | 'ADMIN'
}

export interface TestSpecies {
  id: string
  scientificName: string
  commonName: string
}

export async function seedTestUser(data: {
  email: string
  password: string
  name?: string
  role?: 'USER' | 'RESEARCHER' | 'ADMIN'
}): Promise<TestUser> {
  const hashedPassword = await bcrypt.hash(data.password, 10)
  const timestamp = Date.now()
  const uniqueEmail = data.email.replace('.com', `-${timestamp}.com`)
  const user = await prisma.user.upsert({
    where: { email: uniqueEmail },
    update: { password: hashedPassword },
    create: {
      name: data.name || 'Test User',
      email: uniqueEmail,
      password: hashedPassword,
      role: data.role || 'USER',
      firebaseUid: `test-${timestamp}-${Math.random().toString(36).slice(2)}`,
    },
  })
  return { id: user.id, email: uniqueEmail, password: data.password, role: user.role }
}

export async function seedTestSpecies(data: {
  scientificName: string
  commonName: string
  description?: string
}): Promise<TestSpecies> {
  const species = await prisma.species.create({
    data: {
      scientificName: data.scientificName,
      commonName: data.commonName,
      description: data.description || 'Test species',
      keyFeatures: [],
      images: [],
      distributionZones: [],
    },
  })
  return { id: species.id, scientificName: species.scientificName, commonName: species.commonName }
}

export async function cleanupTestUsers(emails: string[]): Promise<void> {
  await prisma.observation.deleteMany({
    where: { user: { email: { in: emails } } },
  })
  await prisma.user.deleteMany({
    where: { email: { in: emails } },
  })
}

export async function cleanupTestSpecies(scientificNames: string[]): Promise<void> {
  await prisma.observation.deleteMany({
    where: { species: { scientificName: { in: scientificNames } } },
  })
  await prisma.species.deleteMany({
    where: { scientificName: { in: scientificNames } },
  })
}

export async function cleanupByUserId(userId: string): Promise<void> {
  await prisma.observation.deleteMany({ where: { userId } })
  await prisma.user.delete({ where: { id: userId } })
}

export async function cleanupBySpeciesId(speciesId: string): Promise<void> {
  await prisma.observation.deleteMany({ where: { speciesId } })
  await prisma.species.delete({ where: { id: speciesId } })
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
}
