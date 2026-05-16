import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import cookieParser from 'cookie-parser'
import authRoutes from '../../routes/authRoutes'
import userRoutes from '../../routes/userRoutes'
import speciesRoutes from '../../routes/speciesRoutes'
import observationRoutes from '../../routes/observationRoutes'
import analyticsRoutes from '../../routes/analyticsRoutes'
import uploadRoutes from '../../routes/uploadRoutes'
import { errorHandler, notFoundHandler } from '../../middleware/error'
import { swaggerSpec } from '../../config/swagger'

const app = express()

app.use(helmet())
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

app.get('/api/v1/docs-json', (_req, res) => {
  res.json(swaggerSpec)
})

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CrabWatch API Docs',
}))

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/species', speciesRoutes)
app.use('/api/v1/observations', observationRoutes)
app.use('/api/v1/analytics', analyticsRoutes)
app.use('/api/v1/upload', uploadRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(errorHandler)
app.use(notFoundHandler)

export default app
