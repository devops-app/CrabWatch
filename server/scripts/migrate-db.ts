import 'dotenv/config'
import Prisma from '@prisma/client'

const tempUrl = 'postgresql://crabwatchadmin:becbf8e2-96cd-4f07-8c42-3e0f4a38ad88@crabwatch-db-temp.postgres.database.azure.com:5432/crabwatch?sslmode=require'
const prodUrl = process.env.DATABASE_URL

if (!prodUrl) {
  console.error('DATABASE_URL not set in .env')
  process.exit(1)
}

const tempClient = new Prisma.PrismaClient({ datasources: { db: { url: tempUrl } } })
const prodClient = new Prisma.PrismaClient({ datasources: { db: { url: prodUrl } } })

// Each entry: [prismaAccessor, sortField]
const models: [string, string][] = [
  ['gamificationRule', 'createdAt'],
  ['levelConfig', 'createdAt'],
  ['achievement', 'createdAt'],
  ['onboardingFlow', 'createdAt'],
  ['missionDefinition', 'createdAt'],
  ['season', 'createdAt'],
  ['challenge', 'createdAt'],
  ['species', 'id'],
  ['invite', 'createdAt'],
  ['user', 'id'],
  ['fcmToken', 'createdAt'],
  ['passwordReset', 'createdAt'],
  ['campaign', 'createdAt'],
  ['observation', 'createdAt'],
  ['notificationDelivery', 'createdAt'],
  ['xPTransaction', 'createdAt'],
  ['userAchievement', 'earnedAt'],
  ['onboardingProgress', 'createdAt'],
  ['userMission', 'createdAt'],
  ['userSeasonStat', 'updatedAt'],
  ['userInsight', 'createdAt'],
  ['notificationPreference', 'updatedAt'],
  ['auditLog', 'createdAt'],
  ['abuseSignal', 'createdAt'],
  ['translation', 'createdAt'],
]

async function main() {
  console.log('📦 Connecting to temp DB...')
  console.log('📦 Connecting to production DB...')

  for (const [model, field] of models) {
    try {
      const data = await tempClient[model].findMany({
        orderBy: { [field]: 'asc' },
      })

      if (data.length === 0) {
        console.log(`  ⊘ ${model}: no records`)
        continue
      }

      await prodClient[model].deleteMany({})

      for (let i = 0; i < data.length; i += 100) {
        const batch = data.slice(i, i + 100)
        await prodClient[model].createMany({ data: batch, skipDuplicates: true })
      }

      console.log(`  ✓ ${model}: ${data.length} records copied`)
    } catch (err: any) {
      console.error(`  ✗ ${model}: ${err.message}`)
    }
  }

  console.log('\n✅ Migration complete!')
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1) })
  .finally(async () => {
    await tempClient.$disconnect()
    await prodClient.$disconnect()
  })
