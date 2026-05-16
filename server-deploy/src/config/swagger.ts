import swaggerJsdoc from 'swagger-jsdoc'
import { config } from '../config'

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CrabWatch API',
      version: '1.0.0',
      description: 'API for the Malaysian Crab Population Monitoring System',
      contact: {
        name: 'CrabWatch',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'name', 'email', 'role'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'researcher', 'admin'] },
            avatar: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Species: {
          type: 'object',
          required: ['id', 'scientificName', 'commonName', 'description'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            scientificName: { type: 'string' },
            commonName: { type: 'string' },
            description: { type: 'string' },
            keyFeatures: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  trait: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
            images: { type: 'array', items: { type: 'string' } },
            distributionZones: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  polygon: { type: 'array', items: { type: 'array', items: { type: 'number' } } },
                },
              },
            },
          },
        },
        Observation: {
          type: 'object',
          required: ['id', 'userId', 'speciesId', 'cw', 'bw', 'gender', 'maturationStatus', 'lat', 'lng'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            speciesId: { type: 'string', format: 'uuid' },
            cw: { type: 'number', description: 'Carapace Width (mm)' },
            bw: { type: 'number', description: 'Body Weight (g)' },
            gender: { type: 'string', enum: ['male', 'female', 'unknown'] },
            maturationStatus: { type: 'string', enum: ['mature', 'immature', 'unknown'] },
            lat: { type: 'number', minimum: -90, maximum: 90 },
            lng: { type: 'number', minimum: -180, maximum: 180 },
            locationMethod: { type: 'string', enum: ['gps', 'manual'] },
            photos: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            validatedBy: { type: 'string', nullable: true },
            validatedAt: { type: 'string', format: 'date-time', nullable: true },
            rejectionReason: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(swaggerOptions)
