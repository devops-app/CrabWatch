import { PrismaClient } from '@prisma/client'

const prismaLogs: Array<'query' | 'error' | 'warn'> = process.env.NODE_ENV === 'development'
  ? (process.env.PRISMA_LOG_QUERIES === 'true' ? ['query', 'error', 'warn'] : ['error', 'warn'])
  : ['error']

const prisma = new PrismaClient({
  log: prismaLogs,
})

export default prisma
