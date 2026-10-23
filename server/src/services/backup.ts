import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'
import zlib from 'zlib'
import { Transform } from 'stream'
import { Response } from 'express'
import type { TOptions } from 'i18next'
import { sanitizeFilename } from '../utils/sanitize'
import { getPrisma } from './container'
import { BackupResult, BackupFileInfo, CsvExportTable } from '@crabwatch/shared'
import { NotFoundError } from '../utils/errors'
import logger from '../utils/logger'

/** i18n translator signature (matches `createTranslator` in middleware/i18n). */
export type Translator = (key: string, ns?: string, options?: TOptions) => string

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || './backups')
/** Cursor page size for streaming backup/CSV reads (bounds memory). */
const BACKUP_PAGE = 1000
/** Only generated backup files may be listed/downloaded/deleted. */
const BACKUP_FILE_RE = /^crabwatch_backup_\d{8}_\d{6}\.json\.gz$/

/**
 * Resolve a backup filename to a canonical path and verify it is contained
 * within BACKUP_DIR (defends against path traversal and symlink escapes).
 */
async function resolveBackupPath(fileName: string): Promise<string> {
  const resolvedDir = await fsp.realpath(BACKUP_DIR)
  const target = path.resolve(resolvedDir, fileName)
  if (path.dirname(target) !== resolvedDir) {
    throw new NotFoundError('Backup not found')
  }
  return target
}

/**
 * Neutralize spreadsheet formula injection: prefix cells that begin with a
 * formula marker (=, +, -, @, tab, CR) with a single quote so spreadsheet
 * applications treat them as literal text.
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

/** Escape a value for CSV output (quote when it contains delimiters). */
function escapeCsv(value: string | number | boolean | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Push a chunk to a stream, awaiting 'drain' when the internal buffer is full
 * so we respect backpressure instead of buffering unboundedly.
 */
function pushChunk(stream: Transform, chunk: string): Promise<void> {
  const ok = stream.push(chunk)
  if (ok) return Promise.resolve()
  return new Promise((resolve) => stream.once('drain', resolve))
}

/** Resolve when a writable stream has flushed and closed (or errored). */
function streamFinished(stream: NodeJS.WritableStream): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve())
    stream.on('error', reject)
  })
}

/**
 * Stream a table to `stream` as a JSON array, reading cursor pages so the
 * whole table is never held in memory. Emits a comma between rows.
 */
async function streamTable(
  stream: Transform,
  fetchPage: (cursor: string | undefined, take: number) => Promise<Array<Record<string, unknown>>>,
  pageSize: number,
): Promise<void> {
  let cursor: string | undefined
  let first = true
  for (;;) {
    const page = await fetchPage(cursor, pageSize)
    for (const row of page) {
      if (!first) await pushChunk(stream, ',')
      await pushChunk(stream, JSON.stringify(row))
      first = false
    }
    if (page.length < pageSize) break
    cursor = (page[page.length - 1] as { id: string }).id
  }
}

/**
 * Stream a CSV export directly to the HTTP response, reading cursor pages so
 * the full table is never materialized in memory. Applies formula-injection
 * neutralization and CSV escaping to every cell. Returns the row count.
 */
async function streamCsv<T>(
  res: Response,
  headers: string[],
  fileName: string,
  fetchPage: (cursor: string | undefined, take: number) => Promise<T[]>,
  formatRow: (row: T) => string[],
): Promise<number> {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

  const writeLine = async (line: string): Promise<void> => {
    const ok = res.write(`${line}\r\n`)
    if (!ok) await new Promise<void>((resolve) => res.once('drain', resolve))
  }

  await writeLine(headers.map((h) => escapeCsv(neutralizeFormula(h))).join(','))

  let cursor: string | undefined
  let rowCount = 0
  for (;;) {
    const page = await fetchPage(cursor, BACKUP_PAGE)
    for (const row of page) {
      await writeLine(formatRow(row).map((cell) => escapeCsv(neutralizeFormula(cell))).join(','))
      rowCount++
    }
    if (page.length < BACKUP_PAGE) break
    cursor = (page[page.length - 1] as { id: string }).id
  }

  res.end()
  return rowCount
}

/** List all generated backup files, newest first. */
export async function listBackupFiles(): Promise<BackupFileInfo[]> {
  await fsp.mkdir(BACKUP_DIR, { recursive: true })

  const entries = await fsp.readdir(BACKUP_DIR)
  const files: BackupFileInfo[] = []

  for (const f of entries) {
    if (!BACKUP_FILE_RE.test(f)) continue
    const stats = await fsp.stat(path.join(BACKUP_DIR, f))
    files.push({
      fileName: f,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
    })
  }

  files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return files
}

/**
 * Delete a generated backup file by (already-sanitized) name. Validates the
 * name against the generated-file pattern and resolves it safely before
 * unlinking.
 */
export async function deleteBackupFile(fileName: string, __: Translator): Promise<void> {
  if (!BACKUP_FILE_RE.test(fileName)) {
    throw new NotFoundError(__('admin.backup.notFound', 'admin'))
  }

  const filePath = await resolveBackupPath(fileName)
  try {
    await fsp.unlink(filePath)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new NotFoundError(__('admin.backup.notFound', 'admin'))
    }
    throw err
  }
}

/**
 * Resolve a (already-sanitized) backup filename to a downloadable path,
 * verifying the file exists. Throws 404 for unknown/invalid names.
 */
export async function resolveBackupDownloadPath(fileName: string, __: Translator): Promise<string> {
  if (!BACKUP_FILE_RE.test(fileName)) {
    throw new NotFoundError(__('admin.backup.notFound', 'admin'))
  }

  const filePath = await resolveBackupPath(fileName)
  try {
    await fsp.access(filePath)
  } catch {
    throw new NotFoundError(__('admin.backup.notFound', 'admin'))
  }
  return filePath
}

/**
 * Run a full streaming database backup to a gzip-compressed JSON file.
 * Streams observations, species, users, and FCM tokens in cursor pages so the
 * whole dataset is never held in memory. Returns the backup metadata.
 */
export async function runDatabaseBackup(): Promise<BackupResult> {
  await fsp.mkdir(BACKUP_DIR, { recursive: true })

  const timestamp = new Date()
  const fileName = `crabwatch_backup_${timestamp.getUTCFullYear()}${String(timestamp.getUTCMonth() + 1).padStart(2, '0')}${String(timestamp.getUTCDate()).padStart(2, '0')}_${String(timestamp.getUTCHours()).padStart(2, '0')}${String(timestamp.getUTCMinutes()).padStart(2, '0')}${String(timestamp.getUTCSeconds()).padStart(2, '0')}.json.gz`
  const filePath = path.join(BACKUP_DIR, fileName)
  const tmpPath = `${filePath}.tmp`

  const db = getPrisma()

  // Pipeline: incremental JSON -> gzip -> temp file -> atomic rename.
  const jsonStream = new Transform({
    transform(chunk, _enc, cb) {
      this.push(chunk)
      cb()
    },
    flush(cb) {
      cb()
    },
  })
  const gzip = zlib.createGzip()
  const out = fs.createWriteStream(tmpPath)
  jsonStream.pipe(gzip).pipe(out)

  try {
    await pushChunk(jsonStream, `{"version":"1.0","exportedAt":${JSON.stringify(timestamp.toISOString())},`)

    await pushChunk(jsonStream, '"observations":[')
    await streamTable(jsonStream, (cursor, take) =>
      db.observation.findMany({
        orderBy: { id: 'asc' },
        take,
        cursor: cursor ? { id: cursor } : undefined,
      }),
      BACKUP_PAGE,
    )
    await pushChunk(jsonStream, '],')

    await pushChunk(jsonStream, '"species":[')
    await streamTable(jsonStream, (cursor, take) =>
      db.species.findMany({
        orderBy: { id: 'asc' },
        take,
        cursor: cursor ? { id: cursor } : undefined,
      }),
      BACKUP_PAGE,
    )
    await pushChunk(jsonStream, '],')

    // Explicit field selection: keep recovery-relevant fields, drop nothing
    // critical, but never dump the whole row shape implicitly.
    await pushChunk(jsonStream, '"users":[')
    await streamTable(jsonStream, (cursor, take) =>
      db.user.findMany({
        orderBy: { id: 'asc' },
        take,
        cursor: cursor ? { id: cursor } : undefined,
        select: {
          id: true,
          name: true,
          email: true,
          phoneCode: true,
          phoneNumber: true,
          addressLine1: true,
          addressLine2: true,
          state: true,
          postcode: true,
          country: true,
          role: true,
          avatar: true,
          password: true,
          firebaseUid: true,
          deletedAt: true,
          blockedAt: true,
          blockReason: true,
          createdAt: true,
          approvedCount: true,
          currentStreak: true,
          lastActiveDate: true,
          level: true,
          longestStreak: true,
          title: true,
          totalSubmissions: true,
          totalXP: true,
          preferredLocale: true,
          consentAccepted: true,
        },
      }),
      BACKUP_PAGE,
    )
    await pushChunk(jsonStream, '],')

    await pushChunk(jsonStream, '"fcmTokens":[')
    await streamTable(jsonStream, (cursor, take) =>
      db.fcmToken.findMany({
        orderBy: { id: 'asc' },
        take,
        cursor: cursor ? { id: cursor } : undefined,
      }),
      BACKUP_PAGE,
    )
    await pushChunk(jsonStream, ']}')

    jsonStream.end()
    await streamFinished(out)
    await fsp.rename(tmpPath, filePath)
  } catch (err) {
    await fsp.unlink(tmpPath).catch(() => undefined)
    throw err
  }

  const stats = await fsp.stat(filePath)

  const result: BackupResult = {
    fileName,
    size: stats.size,
    timestamp: timestamp.toISOString(),
  }

  logger.info({ fileName, size: stats.size }, 'Database backup completed')
  return result
}

/**
 * Stream a CSV export of the given table directly to the HTTP response,
 * reading cursor pages so the full table is never materialized in memory.
 */
export async function streamCsvExport(res: Response, table: CsvExportTable): Promise<void> {
  const db = getPrisma()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  if (table === 'observations') {
    const headers = [
      'id', 'userId', 'userName', 'userEmail', 'speciesId', 'speciesName',
      'cw', 'bw', 'gender', 'maturationStatus', 'lat', 'lng', 'locationMethod',
      'status', 'validatedBy', 'validatedAt', 'rejectionReason',
      'detectedCoin', 'notes', 'photoCount', 'uploadSessionId', 'createdAt',
    ]
    const fileName = `crabwatch_observations_${timestamp}.csv`

    const rowCount = await streamCsv(
      res,
      headers,
      fileName,
      (cursor, take) =>
        db.observation.findMany({
          orderBy: { id: 'asc' },
          take,
          cursor: cursor ? { id: cursor } : undefined,
          include: {
            species: { select: { scientificName: true } },
            user: { select: { email: true, name: true } },
          },
        }),
      (obs) => [
        obs.id,
        obs.userId,
        obs.user?.name ?? '',
        obs.user?.email ?? '',
        obs.speciesId,
        obs.species?.scientificName ?? '',
        String(obs.cw),
        obs.bw != null ? String(obs.bw) : '',
        obs.gender,
        obs.maturationStatus,
        String(obs.lat),
        String(obs.lng),
        obs.locationMethod,
        obs.status,
        obs.validatedBy ?? '',
        obs.validatedAt?.toISOString() ?? '',
        obs.rejectionReason ?? '',
        obs.detectedCoin ?? '',
        obs.notes ?? '',
        String(Array.isArray(obs.photos) ? obs.photos.length : 0),
        obs.uploadSessionId ?? '',
        obs.createdAt.toISOString(),
      ],
    )

    logger.info({ table, rowCount, fileName }, 'CSV export generated')
    return
  }

  if (table === 'species') {
    const headers = [
      'id', 'scientificName', 'commonName', 'description',
      'keyFeatures', 'images', 'distributionZones', 'observationCount',
    ]
    const fileName = `crabwatch_species_${timestamp}.csv`

    const rowCount = await streamCsv(
      res,
      headers,
      fileName,
      (cursor, take) =>
        db.species.findMany({
          orderBy: { id: 'asc' },
          take,
          cursor: cursor ? { id: cursor } : undefined,
          include: { _count: { select: { observations: true } } },
        }),
      (sp) => [
        sp.id,
        sp.scientificName,
        sp.commonName,
        sp.description,
        JSON.stringify(sp.keyFeatures),
        JSON.stringify(sp.images),
        JSON.stringify(sp.distributionZones),
        String(sp._count.observations),
      ],
    )

    logger.info({ table, rowCount, fileName }, 'CSV export generated')
    return
  }

  // users
  const headers = [
    'id', 'name', 'email', 'phoneCode', 'phoneNumber', 'role',
    'country', 'state', 'postcode',
    'level', 'title', 'totalXP', 'currentStreak', 'longestStreak',
    'totalSubmissions', 'approvedCount',
    'preferredLocale', 'consentAccepted',
    'blockedAt', 'blockReason', 'deletedAt', 'createdAt',
  ]
  const fileName = `crabwatch_users_${timestamp}.csv`

  const rowCount = await streamCsv(
    res,
    headers,
    fileName,
    (cursor, take) =>
      db.user.findMany({
        orderBy: { id: 'asc' },
        take,
        cursor: cursor ? { id: cursor } : undefined,
        where: { deletedAt: null },
      }),
    (u) => [
      u.id,
      u.name,
      u.email,
      u.phoneCode ?? '',
      u.phoneNumber ?? '',
      u.role,
      u.country ?? '',
      u.state ?? '',
      u.postcode ?? '',
      String(u.level),
      u.title,
      String(u.totalXP),
      String(u.currentStreak),
      String(u.longestStreak),
      String(u.totalSubmissions),
      String(u.approvedCount),
      u.preferredLocale ?? 'en',
      String(u.consentAccepted),
      u.blockedAt?.toISOString() ?? '',
      u.blockReason ?? '',
      u.deletedAt?.toISOString() ?? '',
      u.createdAt.toISOString(),
    ],
  )

  logger.info({ table, rowCount, fileName }, 'CSV export generated')
}
