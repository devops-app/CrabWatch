/*
 * Fix bad firebaseUid data.
 *
 * A real Firebase Auth UID is 28-char alphanumeric and is NEVER a UUID. A
 * UUID-valued firebaseUid is always bad data — it was written by the old
 * createUser code that stored the JWT uid (which is the user's own id when
 * firebaseUid is null) into the firebaseUid column. This creates cross-account
 * collisions where resolveUser resolves one login to a different user.
 *
 * This script clears every firebaseUid that matches the UUID pattern.
 *
 * Usage:
 *   node scripts/fix-firebase-uid-collisions.js            # dry run (default)
 *   node scripts/fix-firebase-uid-collisions.js --apply    # actually update
 */
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const apply = process.argv.includes('--apply')

async function main() {
  const users = await p.user.findMany({
    where: { firebaseUid: { not: null } },
    select: { id: true, email: true, role: true, firebaseUid: true, deletedAt: true },
  })

  const bad = users.filter((u) => UUID_RE.test(u.firebaseUid))

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Users with a UUID-valued firebaseUid: ${bad.length}\n`)
  for (const u of bad) {
    console.log(
      `  ${u.email} (${u.role}${u.deletedAt ? ', deleted' : ''}) id=${u.id} firebaseUid=${u.firebaseUid}`
    )
  }

  if (apply && bad.length > 0) {
    const result = await p.user.updateMany({
      where: { firebaseUid: { in: bad.map((u) => u.firebaseUid) } },
      data: { firebaseUid: null },
    })
    console.log(`\nCleared firebaseUid on ${result.count} user(s).`)
  } else if (!apply) {
    console.log('\nDry run — no changes made. Re-run with --apply to clear these values.')
  }
}

main()
  .then(() => p.$disconnect())
  .catch((e) => {
    console.error('ERR', e.message)
    process.exit(1)
  })
