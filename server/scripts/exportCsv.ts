/**
 * exportCsv.ts
 *
 * Exports CrabWatch database tables to CSV files suitable for Excel / Power BI
 * reporting (e.g. a "user submission report").
 *
 * Output characteristics (Excel / Power BI friendly):
 *   - UTF-8 with BOM so Excel detects the encoding correctly
 *   - CRLF (\r\n) line endings
 *   - RFC-4180 style field escaping (quotes, commas, newlines)
 *   - ISO-8601 UTC timestamps
 *
 * Usage (from the `server/` directory):
 *   npx tsx scripts/exportCsv.ts                          # export observations (default)
 *   npx tsx scripts/exportCsv.ts --table=all              # export observations + users + species
 *   npx tsx scripts/exportCsv.ts --table=users            # export only users
 *   npx tsx scripts/exportCsv.ts --from=2026-01-01 --to=2026-06-30
 *   npx tsx scripts/exportCsv.ts --status=APPROVED
 *   npx tsx scripts/exportCsv.ts --include-deleted
 *   npx tsx scripts/exportCsv.ts --output=C:\reports
 *   npx tsx scripts/exportCsv.ts --db-url="postgresql://user:pass@crabwatch-db.postgres.database.azure.com:5432/crabwatch?sslmode=require"
 *
 * Options:
 *   --table=<observations|users|species|all>   Which dataset(s) to export (default: observations)
 *   --from=<YYYY-MM-DD>                        Only include records created on/after this date
 *   --to=<YYYY-MM-DD>                          Only include records created on/before this date (inclusive)
 *   --status=<PENDING|APPROVED|REJECTED>       Filter observations by status
 *   --include-deleted                          Include soft-deleted records
 *   --output=<dir>                             Output directory (default: ./exports)
 *   --db-url=<connection-string>               Override DATABASE_URL (e.g. to export from Azure)
 */

import { PrismaClient, ObservationStatus } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

let prisma: PrismaClient

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

interface CliOptions {
  table: 'observations' | 'users' | 'species' | 'all'
  from?: string
  to?: string
  status?: ObservationStatus
  includeDeleted: boolean
  output: string
  dbUrl?: string
}

const VALID_STATUSES: ObservationStatus[] = ['PENDING', 'APPROVED', 'REJECTED']
const VALID_TABLES = ['observations', 'users', 'species', 'all']

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    table: 'observations',
    includeDeleted: false,
    output: path.resolve(process.cwd(), 'exports'),
  }

  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const eq = arg.indexOf('=')
    const key = (eq === -1 ? arg : arg.slice(2, eq)).toLowerCase()
    const value = eq === -1 ? true : arg.slice(eq + 1)

    switch (key) {
      case 'table': {
        const t = String(value).toLowerCase()
        if (!VALID_TABLES.includes(t)) {
          throw new Error(`Invalid --table "${t}". Use one of: ${VALID_TABLES.join(', ')}`)
        }
        opts.table = t as CliOptions['table']
        break
      }
      case 'from':
        opts.from = String(value)
        break
      case 'to':
        opts.to = String(value)
        break
      case 'status': {
        const s = String(value).toUpperCase()
        if (!VALID_STATUSES.includes(s as ObservationStatus)) {
          throw new Error(`Invalid --status "${s}". Use one of: ${VALID_STATUSES.join(', ')}`)
        }
        opts.status = s as ObservationStatus
        break
      }
      case 'include-deleted':
        opts.includeDeleted = true
        break
      case 'output':
        opts.output = path.resolve(process.cwd(), String(value))
        break
      case 'db-url':
        opts.dbUrl = String(value)
        break
      case 'help':
      case 'h':
        printHelp()
        process.exit(0)
        break
      default:
        console.warn(`Ignoring unknown option: --${key}`)
    }
  }

  return opts
}

function printHelp(): void {
  console.log(`
CrabWatch CSV Export

Usage:
  npx tsx scripts/exportCsv.ts [options]

Options:
  --table=<observations|users|species|all>   Dataset to export (default: observations)
  --from=<YYYY-MM-DD>                        Include records created on/after this date
  --to=<YYYY-MM-DD>                          Include records created on/before this date (inclusive)
  --status=<PENDING|APPROVED|REJECTED>       Filter observations by status
  --include-deleted                          Include soft-deleted records
  --output=<dir>                             Output directory (default: ./exports)
  --db-url=<connection-string>               Override DATABASE_URL (e.g. to export from Azure)
  --help, -h                                 Show this help
`)
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsvField).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(','))
  }
  return lines.join('\r\n')
}

function formatDateTime(value: Date | null | undefined): string {
  if (!value) return ''
  return value.toISOString()
}

function writeCsv(filePath: string, csv: string): void {
  // Prepend UTF-8 BOM so Excel opens the file with the correct encoding.
  fs.writeFileSync(filePath, '\uFEFF' + csv, { encoding: 'utf8' })
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

// ---------------------------------------------------------------------------
// Date range filter builder
// ---------------------------------------------------------------------------

function buildCreatedAtFilter(opts: CliOptions): { createdAt?: { gte?: Date; lt?: Date } } {
  if (!opts.from && !opts.to) return {}
  const filter: { gte?: Date; lt?: Date } = {}
  if (opts.from) {
    const d = new Date(opts.from)
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid --from date: ${opts.from}`)
    filter.gte = d
  }
  if (opts.to) {
    // If a bare date is supplied, make the end inclusive of the whole day.
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(opts.to)
    const d = new Date(isDateOnly ? `${opts.to}T23:59:59.999Z` : opts.to)
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid --to date: ${opts.to}`)
    filter.lt = d
  }
  return { createdAt: filter }
}

// ---------------------------------------------------------------------------
// Exporters
// ---------------------------------------------------------------------------

async function exportObservations(opts: CliOptions): Promise<{ file: string; count: number }> {
  const observations = await prisma.observation.findMany({
    where: {
      ...(opts.includeDeleted ? {} : { deletedAt: null }),
      ...(opts.status ? { status: opts.status } : {}),
      ...buildCreatedAtFilter(opts),
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      species: { select: { id: true, scientificName: true, commonName: true } },
      validator: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Observation ID',
    'Submitted At',
    'User ID',
    'User Name',
    'User Email',
    'User Role',
    'Species Scientific Name',
    'Species Common Name',
    'Carapace Width (cw)',
    'Body Weight (bw)',
    'Gender',
    'Maturation Status',
    'Latitude',
    'Longitude',
    'Location Method',
    'Detected Coin',
    'Status',
    'Validated By',
    'Validated At',
    'Rejection Reason',
    'Notes',
    'Photo Count',
    'Photos',
  ]

  const rows = observations.map((o) => {
    const photos = Array.isArray(o.photos) ? (o.photos as string[]) : []
    return [
      o.id,
      formatDateTime(o.createdAt),
      o.userId,
      o.user?.name ?? '',
      o.user?.email ?? '',
      o.user?.role ?? '',
      o.species?.scientificName ?? '',
      o.species?.commonName ?? '',
      o.cw,
      o.bw,
      o.gender,
      o.maturationStatus,
      o.lat,
      o.lng,
      o.locationMethod,
      o.detectedCoin,
      o.status,
      o.validator?.name ?? '',
      formatDateTime(o.validatedAt),
      o.rejectionReason,
      o.notes,
      photos.length,
      photos.join(' | '),
    ]
  })

  const file = path.join(opts.output, `observations_${timestamp()}.csv`)
  writeCsv(file, toCsv(headers, rows))
  return { file, count: rows.length }
}

async function exportUsers(opts: CliOptions): Promise<{ file: string; count: number }> {
  const users = await prisma.user.findMany({
    where: {
      ...(opts.includeDeleted ? {} : { deletedAt: null }),
      ...buildCreatedAtFilter(opts),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneCode: true,
      phoneNumber: true,
      state: true,
      country: true,
      role: true,
      level: true,
      title: true,
      totalXP: true,
      totalSubmissions: true,
      approvedCount: true,
      currentStreak: true,
      longestStreak: true,
      lastActiveDate: true,
      preferredLocale: true,
      consentAccepted: true,
      createdAt: true,
      deletedAt: true,
      blockedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'User ID',
    'Name',
    'Email',
    'Phone Code',
    'Phone Number',
    'State',
    'Country',
    'Role',
    'Level',
    'Title',
    'Total XP',
    'Total Submissions',
    'Approved Count',
    'Current Streak',
    'Longest Streak',
    'Last Active Date',
    'Preferred Locale',
    'Consent Accepted',
    'Created At',
    'Deleted At',
    'Blocked At',
  ]

  const rows = users.map((u) => [
    u.id,
    u.name,
    u.email,
    u.phoneCode,
    u.phoneNumber,
    u.state,
    u.country,
    u.role,
    u.level,
    u.title,
    u.totalXP,
    u.totalSubmissions,
    u.approvedCount,
    u.currentStreak,
    u.longestStreak,
    formatDateTime(u.lastActiveDate),
    u.preferredLocale,
    u.consentAccepted,
    formatDateTime(u.createdAt),
    formatDateTime(u.deletedAt),
    formatDateTime(u.blockedAt),
  ])

  const file = path.join(opts.output, `users_${timestamp()}.csv`)
  writeCsv(file, toCsv(headers, rows))
  return { file, count: rows.length }
}

async function exportSpecies(opts: CliOptions): Promise<{ file: string; count: number }> {
  const species = await prisma.species.findMany({
    select: {
      id: true,
      scientificName: true,
      commonName: true,
      description: true,
      keyFeatures: true,
      distributionZones: true,
      _count: { select: { observations: true } },
    },
    orderBy: { commonName: 'asc' },
  })

  const headers = [
    'Species ID',
    'Scientific Name',
    'Common Name',
    'Description',
    'Key Features',
    'Distribution Zones',
    'Observation Count',
  ]

  const rows = species.map((s) => [
    s.id,
    s.scientificName,
    s.commonName,
    s.description,
    s.keyFeatures,
    s.distributionZones,
    s._count.observations,
  ])

  const file = path.join(opts.output, `species_${timestamp()}.csv`)
  writeCsv(file, toCsv(headers, rows))
  return { file, count: rows.length }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2))

  // Initialize the Prisma client. If --db-url is provided (e.g. to target the
  // Azure production database), use it; otherwise fall back to DATABASE_URL
  // from the environment / .env file.
  const dbUrl = opts.dbUrl || process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('No database URL. Provide --db-url or set DATABASE_URL in server/.env')
  }
  prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })

  fs.mkdirSync(opts.output, { recursive: true })

  // Show the target host with the password masked.
  let dbHost = dbUrl
  try {
    const u = new URL(dbUrl)
    dbHost = `${u.protocol}//${u.username}:***@${u.host}${u.pathname}`
  } catch {
    dbHost = dbUrl.replace(/:([^:@/]+)@/, ':***@')
  }

  console.log('CrabWatch CSV Export')
  console.log('====================')
  console.log(`Database:         ${dbHost}`)
  console.log(`Table:            ${opts.table}`)
  if (opts.from) console.log(`From:             ${opts.from}`)
  if (opts.to) console.log(`To:               ${opts.to}`)
  if (opts.status) console.log(`Status:           ${opts.status}`)
  console.log(`Include deleted:  ${opts.includeDeleted ? 'yes' : 'no'}`)
  console.log(`Output dir:       ${opts.output}`)
  console.log('')

  const results: Array<{ file: string; count: number }> = []

  try {
    if (opts.table === 'observations' || opts.table === 'all') {
      const r = await exportObservations(opts)
      results.push(r)
      console.log(`✓ observations -> ${r.file} (${r.count} rows)`)
    }
    if (opts.table === 'users' || opts.table === 'all') {
      const r = await exportUsers(opts)
      results.push(r)
      console.log(`✓ users        -> ${r.file} (${r.count} rows)`)
    }
    if (opts.table === 'species' || opts.table === 'all') {
      const r = await exportSpecies(opts)
      results.push(r)
      console.log(`✓ species      -> ${r.file} (${r.count} rows)`)
    }

    console.log('')
    console.log(`Done. ${results.length} file(s) written to ${opts.output}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(async (err) => {
  console.error('\nExport failed:', err instanceof Error ? err.message : err)
  await prisma.$disconnect()
  process.exit(1)
})
