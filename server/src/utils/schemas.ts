import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().nullable().optional(),
})

export const updateRoleSchema = z.object({
  role: z.enum(['USER', 'RESEARCHER', 'ADMIN']),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const verifyTokenSchema = z.object({
  token: z.string(),
})

export const createSpeciesSchema = z.object({
  scientificName: z.string().min(1),
  commonName: z.string().min(1),
  description: z.string(),
  keyFeatures: z.array(z.object({ trait: z.string(), value: z.string() })),
  images: z.array(z.string().url()),
  distributionZones: z.array(
    z.object({
      name: z.string(),
      polygon: z.array(z.tuple([z.number(), z.number()])),
    })
  ),
})

export const updateSpeciesSchema = createSpeciesSchema.partial()

export const createObservationSchema = z.object({
  speciesId: z.string().uuid(),
  cw: z.number().positive().max(50),
  bw: z.number().positive().max(5000).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN', 'male', 'female', 'unknown']),
  maturationStatus: z.enum(['MATURE', 'IMMATURE', 'UNKNOWN', 'mature', 'immature', 'unknown']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  locationMethod: z.enum(['GPS', 'MANUAL', 'gps', 'manual']),
  photos: z.array(z.string().url()),
  detectedCoin: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional(),
})

export const validateObservationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'approved', 'rejected']),
  rejectionReason: z.string().max(500).optional(),
})
