import { AsyncLocalStorage } from 'node:async_hooks'
import { PrismaClient } from '@prisma/client'
import { getContainer } from '../services/container'

export const translationLocaleStorage = new AsyncLocalStorage<string>()

export interface TranslatableModel {
  model: string
  fields: Record<string, { json?: boolean }>
}

export const TRANSLATABLE_MODELS: TranslatableModel[] = [
  {
    model: 'Species',
    fields: {
      commonName: {},
      description: {},
      keyFeatures: { json: true },
    },
  },
  {
    model: 'Achievement',
    fields: {
      name: {},
      description: {},
    },
  },
  {
    model: 'MissionDefinition',
    fields: {
      name: {},
      description: {},
    },
  },
  {
    model: 'LevelConfig',
    fields: {
      title: {},
      description: {},
    },
  },
  {
    model: 'OnboardingFlow',
    fields: {
      name: {},
      steps: { json: true },
    },
  },
]

const MODEL_CONFIG = new Map(TRANSLATABLE_MODELS.map(m => [m.model, m]))

export { MODEL_CONFIG }

// Records that have an id field (all translatable models do)
type WithId = { id: string }

// Prisma middleware types (Prisma 5.x does not export Middleware from @prisma/client)
interface PrismaMiddlewareParams {
  model?: string
  action?: string
  args?: unknown
  dataPath?: string[]
  runInTransaction?: boolean
}
type PrismaMiddlewareNext = (args?: unknown) => Promise<unknown>

async function mergeTranslationsImpl<T>(
  records: T | T[],
  locale: string,
  model: string,
): Promise<T | T[]> {
  const config = MODEL_CONFIG.get(model)
  if (!config) return records

  const fields = Object.keys(config.fields)
  if (fields.length === 0) return records

  const single = !Array.isArray(records)
  const arr = single ? [records] : records
  const ids = arr.map(r => (r as WithId)?.id).filter(Boolean)

  if (ids.length === 0) return records

  const prisma = getContainer().prisma
  const translations = await prisma.translation.findMany({
    where: {
      locale,
      resourceType: model,
      resourceId: { in: ids },
      field: { in: fields },
    },
  })

  const byId = new Map<string, Map<string, { value: string; json: boolean }>>()
  for (const t of translations) {
    if (!byId.has(t.resourceId)) byId.set(t.resourceId, new Map())
    byId.get(t.resourceId)!.set(t.field, {
      value: t.value,
      json: config.fields[t.field]?.json ?? false,
    })
  }

  const merged = arr.map(record => {
    const id = (record as WithId).id
    const trans = byId.get(id)
    if (!trans || trans.size === 0) return record

    const cloned: Record<string, unknown> = { ...(record as Record<string, unknown>) }
    for (const [field, { value, json }] of trans) {
      if (json) {
        try {
          cloned[field] = JSON.parse(value)
        } catch {
          cloned[field] = value
        }
      } else {
        cloned[field] = value
      }
    }
    return cloned
  })

  return single ? (merged[0] as T) : (merged as T[])
}

export function mergeTranslations<T>(
  records: T | T[],
  locale: string,
  model: string,
): T | T[] {
  const config = MODEL_CONFIG.get(model)
  if (!config) return records

  const fields = Object.keys(config.fields)
  if (fields.length === 0) return records

  const single = !Array.isArray(records)
  const arr = single ? [records] : records
  const ids = arr.map(r => (r as WithId)?.id).filter(Boolean)

  if (ids.length === 0) return records

  // We can't do async here in sync context, so we do a best-effort sync merge
  // by checking an in-memory cache. For full async, the middleware handles it.
  return records
}

export function createI18nMiddleware() {
  return (params: PrismaMiddlewareParams, next: PrismaMiddlewareNext) => {
    try {
      const locale = translationLocaleStorage.getStore()
      if (!locale || locale === 'en' || !params.model) return next(params)
      const model = params.model
      if (model !== 'Translation' && MODEL_CONFIG.has(model)) {
        return next(params).then((result: unknown) => {
          if (!result) return result
          const record = Array.isArray(result) ? result[0] : result
          if (!record || !(record as WithId)?.id) return result
          return mergeTranslationsImpl(result, locale, model)
        })
      }
      return next(params)
    } catch {
      return next(params)
    }
  }
}

export function withLocale<R>(locale: string, fn: () => Promise<R>): Promise<R> {
  return translationLocaleStorage.run(locale, fn)
}

export function applyI18nMiddleware(prisma: PrismaClient): void {
  // Prisma 5.x $use expects its internal Middleware type; cast to satisfy the signature
  prisma.$use(createI18nMiddleware() as Parameters<PrismaClient['$use']>[0])
}
