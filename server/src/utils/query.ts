import { Prisma } from '@prisma/client'

export const OBSERVATION_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  species: { select: { id: true, scientificName: true, commonName: true } },
} as const

export type ObservationInclude = typeof OBSERVATION_INCLUDE

export type ObservationWithRelations = Prisma.ObservationGetPayload<{
  include: typeof OBSERVATION_INCLUDE
}>

export function parsePagination(query: { page?: string | string[]; limit?: string | string[] }): {
  page: number
  limit: number
} {
  const page = Math.min(Math.max(1, parseInt(query.page as string) || 1), 100)
  const limit = Math.min(Math.max(1, parseInt(query.limit as string) || 20), 100)

  return { page, limit }
}
