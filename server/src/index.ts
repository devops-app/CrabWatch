// Application Insights auto-instrumentation (MUST be first import)
import { useAzureMonitor } from '@azure/monitor-opentelemetry'
useAzureMonitor()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import cookieParser from 'cookie-parser'
import { config } from './config'
import { swaggerSpec } from './config/swagger'
import { errorHandler, notFoundHandler } from './middleware/error'
import { docsAuthMiddleware } from './middleware/docsAuth'
import { performanceMiddleware, getPerformanceMetrics } from './middleware/performance'
import { requestIdMiddleware } from './middleware/requestId'
import { requestLogger } from './middleware/requestLogger'
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import adminRoutes from './routes/adminRoutes'
import speciesRoutes from './routes/speciesRoutes'
import observationRoutes from './routes/observationRoutes'
import analyticsRoutes from './routes/analyticsRoutes'
import uploadRoutes from './routes/uploadRoutes'
import fcmRoutes from './routes/fcmRoutes'
import analysisRoutes from './routes/analysisRoutes'
import gamificationRoutes from './routes/gamificationRoutes'
import engagementRoutes from './routes/engagementRoutes'
import adminEngagementRoutes from './routes/adminEngagementRoutes'
import prisma from './config/database'
import { createContainer } from './services/container'
import admin from './config/firebase'
import { getBlobService } from './services/upload'

// Initialize DI container before any services are used
createContainer(prisma, config, admin, getBlobService)

const app = express()

app.use(requestIdMiddleware)
app.use(compression())
app.use(requestLogger)
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: config.nodeEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true } : undefined,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}))
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(performanceMiddleware)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again later.' },
})
app.use('/api/v1/auth/login', authLimiter)
app.use('/api/v1/users/register', authLimiter)

const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 100 : 300,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/v1/analytics', analyticsLimiter)

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 500 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', apiLimiter)

const adminEngagementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 60 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many admin engagement requests. Please try again later.' },
})
app.use('/api/v1/admin/engagement/gamification/rules', adminEngagementLimiter)
app.use('/api/v1/admin/engagement/gamification/levels', adminEngagementLimiter)
app.use('/api/v1/admin/engagement/gamification/adjust-xp', adminEngagementLimiter)
app.use('/api/v1/admin/engagement/gamification/recalculate', adminEngagementLimiter)
app.use('/api/v1/admin/engagement/achievements', adminEngagementLimiter)
app.use('/api/v1/admin/engagement/missions', adminEngagementLimiter)
app.use('/api/v1/admin/engagement/seasons', adminEngagementLimiter)
app.use('/api/v1/admin/engagement/campaigns', adminEngagementLimiter)
app.use('/api/v1/admin/engagement/abuse-signals', adminEngagementLimiter)

const isDocsEnabled = config.nodeEnv !== 'production'
if (isDocsEnabled) {
  app.get('/api/v1/docs-json', docsAuthMiddleware, (_req, res) => {
    res.json(swaggerSpec)
  })
  app.use('/api/v1/docs', docsAuthMiddleware, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CrabWatch API Docs',
  }))
}

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/species', speciesRoutes)
app.use('/api/v1/observations', observationRoutes)
app.use('/api/v1/analytics', analyticsRoutes)
app.use('/api/v1/upload', uploadRoutes)
app.use('/api/v1/fcm', fcmRoutes)
app.use('/api/v1/analyze', analysisRoutes)
app.use('/api/v1/gamification', gamificationRoutes)
app.use('/api/v1/engagement', engagementRoutes)
app.use('/api/v1/admin', adminEngagementRoutes)

app.post('/api/v1/telemetry/error', (req, res) => {
  const { message, stack, componentStack } = req.body || {}
  console.error(`[FRONTEND-ERROR] ${message} - ComponentStack: ${componentStack || 'N/A'} - Stack: ${stack || 'N/A'}`)
  res.status(204).end()
})

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable' })
  }
})

app.get('/api/v1/metrics/performance', docsAuthMiddleware, (_req, res) => {
  res.json({
    success: true,
    data: getPerformanceMetrics(),
  })
})

app.use(errorHandler)
app.use(notFoundHandler)

function scheduleJob(fn: () => Promise<any>, name: string, getNextRun: () => Date): void {
  const nextRun = getNextRun()
  const delay = nextRun.getTime() - Date.now()

  console.log(`[SCHEDULER] ${name} scheduled for ${nextRun.toISOString()} (${Math.round(delay / 1000 / 60)}min from now)`)

  setTimeout(async () => {
    try {
      const result = await fn()
      console.log(`[SCHEDULER] ${name} completed:`, result)
    } catch (err) {
      console.error(`[SCHEDULER] ${name} failed:`, err)
    }
    // Re-schedule for next run
    const next = getNextRun()
    const d = next.getTime() - Date.now()
    if (d > 0) {
      scheduleJob(fn, name, getNextRun)
    }
  }, delay)
}

const server = app.listen(config.port, config.host, async () => {
  console.log(`CrabWatch API running on http://${config.host}:${config.port}`)
  console.log(`Environment: ${config.nodeEnv}`)

  // Seed engagement defaults (idempotent)
  if (process.env.SEED_ENGAGEMENT_ON_STARTUP !== 'false') {
    try {
      const { seedEngagement } = await import('./services/seedEngagement')
      await seedEngagement()
    } catch (err) {
      console.error('[STARTUP] Failed to seed engagement data:', err)
    }
  } else {
    console.log('[STARTUP] Skipping engagement seed (SEED_ENGAGEMENT_ON_STARTUP=false)')
  }

  // Schedule daily mission assignment (runs at midnight UTC)
  try {
    const { assignDailyMissions, assignWeeklyMissions } = await import('./jobs/assignDailyMissions')
    scheduleJob(assignDailyMissions, 'Daily missions', () => new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate() + 1,
        0, 0, 0
      )
    ))
    scheduleJob(assignWeeklyMissions, 'Weekly missions', () => {
      const now = new Date()
      const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7
      const nextMonday = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + daysUntilMonday,
          0, 0, 0
        )
      )
      return nextMonday
    })
  } catch (err) {
    console.error('[STARTUP] Failed to schedule mission jobs:', err)
  }
})

async function gracefulShutdown(): Promise<void> {
  console.log('Shutting down gracefully...')
  server.close(async () => {
    await prisma.$disconnect()
    console.log('Prisma disconnected')
    process.exit(0)
  })
  setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

export default server
