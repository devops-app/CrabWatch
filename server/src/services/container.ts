import { PrismaClient } from '@prisma/client'
import admin from 'firebase-admin'
import { BlobServiceClient } from '@azure/storage-blob'

export interface ServiceConfig {
  host: string
  port: number
  nodeEnv: string
  jwtSecret: string
  corsOrigins: string[]
  frontendUrl: string
  foundry: {
    agentName: string
    agentVersion: string | undefined
    apiKey: string | undefined
    projectEndpoint: string | undefined
    apiVersion: string
  }
  azureStorage: {
    connectionString: string | undefined
    containerName: string
  }
  azureBadgeStorage: {
    containerName: string
  }
  resend: {
    apiKey: string | undefined
    fromEmail: string
  }
  engagement: {
    enabled: boolean
    missionsEnabled: boolean
    seasonsEnabled: boolean
    campaignsEnabled: boolean
    abuseDetectionEnabled: boolean
  }
  imageQuality: {
    coverageWarnThresholdPct: number
    autoCropSecondPassEnabled: boolean
  }
}

export interface ServiceContainer {
  prisma: PrismaClient
  config: ServiceConfig
  firebase: typeof admin
  blobService: () => BlobServiceClient
}

let _instance: ServiceContainer | null = null

export function createContainer(
  prisma: PrismaClient,
  config: ServiceConfig,
  firebase: typeof admin,
  getBlobService: () => BlobServiceClient,
): ServiceContainer {
  _instance = { prisma, config, firebase, blobService: getBlobService }
  return _instance
}

export function getContainer(): ServiceContainer {
  if (!_instance) {
    throw new Error('Service container not initialized. Call createContainer() first.')
  }
  return _instance
}

export function resetContainer(): void {
  _instance = null
}

export function getPrisma(): PrismaClient {
  return getContainer().prisma
}

export function getConfig(): ServiceConfig {
  return getContainer().config
}
