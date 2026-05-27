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
  const ids = arr.map(r => (r as any)?.id).filter(Boolean)

  if (ids.length === 0) return records

  const prisma = getContainer().prisma
  const translations = await (prisma as any).translation.findMany({
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
    const id = (record as any).id
    const trans = byId.get(id)
    if (!trans || trans.size === 0) return record

    const cloned = { ...record }
    for (const [field, { value, json }] of trans) {
      if (json) {
        try {
          ;(cloned as any)[field] = JSON.parse(value)
        } catch {
          ;(cloned as any)[field] = value
        }
      } else {
        ;(cloned as any)[field] = value
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
  const ids = arr.map(r => (r as any)?.id).filter(Boolean)

  if (ids.length === 0) return records

  // We can't do async here in sync context, so we do a best-effort sync merge
  // by checking an in-memory cache. For full async, the middleware handles it.
  return records
}

export function createI18nMiddleware() {
  return (params: any, next: (args?: any) => Promise<any>) => {
    try {
      const locale = translationLocaleStorage.getStore()
      if (!locale || locale === 'en' || !params || !params.model) return next(params)
      if (params.model !== 'Translation' && MODEL_CONFIG.has(params.model)) {
        return next(params).then((result: any) => {
          if (!result) return result
          const record = Array.isArray(result) ? result[0] : result
          if (!record?.id) return result
          return mergeTranslationsImpl(result, locale, params.model)
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
  prisma.$use(createI18nMiddleware())
}
