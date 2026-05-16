import "dotenv/config"
import crypto from 'crypto'

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: JWT_SECRET is required in production')
    process.exit(1)
  }
  console.warn('WARNING: JWT_SECRET not set, generating random secret for development only. Do NOT use in production.')
}

export const config = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  azureStorage: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    containerName: process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads',
  },
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:19006').split(','),
  jwtSecret: jwtSecret || crypto.randomBytes(64).toString('hex'),
  foundry: {
    agentName: process.env.FOUNDRY_AGENT_NAME || 'crab-analyzer',
    agentVersion: process.env.FOUNDRY_AGENT_VERSION,
    apiKey: process.env.FOUNDRY_API_KEY,
    projectEndpoint: process.env.FOUNDRY_PROJECT_ENDPOINT,
    apiVersion: process.env.FOUNDRY_API_VERSION || '2025-05-15-preview',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
}

if (!config.databaseUrl) {
  console.error('ERROR: DATABASE_URL is required')
  process.exit(1)
}
