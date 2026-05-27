import { PrismaClient } from '@prisma/client'
import { applyI18nMiddleware } from '../utils/i18n-prisma'

const prismaLogs: Array<'query' | 'error' | 'warn'> = process.env.NODE_ENV === 'development'
  ? (process.env.PRISMA_LOG_QUERIES === 'true' ? ['query', 'error', 'warn'] : ['error', 'warn'])
  : ['error']

const prisma = new PrismaClient({
  log: prismaLogs,
})

applyI18nMiddleware(prisma)

export default prisma
