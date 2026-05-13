import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import cookieParser from 'cookie-parser'
import { config } from './config'
import { swaggerSpec } from './config/swagger'
import { errorHandler, notFoundHandler } from './middleware/error'
import { docsAuthMiddleware } from './middleware/docsAuth'
import { performanceMiddleware, getPerformanceMetrics } from './middleware/performance'
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import speciesRoutes from './routes/speciesRoutes'
import observationRoutes from './routes/observationRoutes'
import analyticsRoutes from './routes/analyticsRoutes'
import uploadRoutes from './routes/uploadRoutes'
import fcmRoutes from './routes/fcmRoutes'
import analysisRoutes from './routes/analysisRoutes'
import prisma from './config/database'

const app = express()

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
app.use('/api/v1/species', speciesRoutes)
app.use('/api/v1/observations', observationRoutes)
app.use('/api/v1/analytics', analyticsRoutes)
app.use('/api/v1/upload', uploadRoutes)
app.use('/api/v1/fcm', fcmRoutes)
app.use('/api/v1/analyze', analysisRoutes)

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

const server = app.listen(config.port, config.host, () => {
  console.log(`CrabWatch API running on http://${config.host}:${config.port}`)
  console.log(`Environment: ${config.nodeEnv}`)
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
