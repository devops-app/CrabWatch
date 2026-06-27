import bcrypt from 'bcryptjs'
import prisma from '../config/database'

const TEST_USERS = Array.from({ length: 20 }, (_, i) => ({
  name: `Test User ${i + 1}`,
  email: `user${i + 1}@crabwatch.my`,
  password: 'Trainpr0',
  phoneCode: '+60',
  phoneNumber: `123456789${i}`,
  addressLine1: `${i + 1} Jalan Test`,
  state: 'Kuala Lumpur',
  postcode: '50000',
  country: 'Malaysia',
  role: 'USER' as const,
}))

async function seedTestUsers(): Promise<void> {
  const db = prisma
  let created = 0
  let skipped = 0

  for (const user of TEST_USERS) {
    const existing = await db.user.findUnique({
      where: { email: user.email },
    })

    if (existing && !existing.deletedAt) {
      console.log(`[SKIP] ${user.email} already exists`)
      skipped++
      continue
    }

    const hashedPassword = await bcrypt.hash(user.password, 10)

    await db.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        phoneCode: user.phoneCode,
        phoneNumber: user.phoneNumber,
        addressLine1: user.addressLine1,
        state: user.state,
        postcode: user.postcode,
        country: user.country,
        preferredLocale: 'en',
        consentAccepted: true,
      },
    })

    console.log(`[OK] Created ${user.email}`)
    created++
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`)
}

if (process.argv[1] === __filename) {
  seedTestUsers().then(() => process.exit(0))
}
