import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phoneCode: z.string().min(1, 'Country code is required').max(5),
  phoneNumber: z.string().min(7, 'Phone number must be at least 7 digits').max(20),
  addressLine1: z.string().min(1, 'Address line 1 is required').max(200),
  addressLine2: z.string().max(200).optional(),
  addressLine3: z.string().max(200).optional(),
  state: z.string().min(1, 'State is required').max(100),
  postcode: z.string().min(1, 'Postcode is required').max(20),
  country: z.string().min(1, 'Country is required').max(100),
  password: z.string().min(8),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phoneCode: z.string().max(5).optional().nullable(),
  phoneNumber: z.string().min(7, 'Phone number must be at least 7 digits').max(20).optional().nullable(),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  addressLine3: z.string().max(200).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  avatar: z.string().url().nullable().optional(),
})

export const updateRoleSchema = z.object({
  role: z.enum(['USER', 'RESEARCHER', 'ADMIN']),
})

export const blockUserSchema = z.object({
  reason: z.string().max(500).optional(),
})

export const restoreUserSchema = z.object({})

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
  photos: z.array(
    z.string().url().refine((url) => /^https?:\/\//i.test(url), {
      message: 'Photo URL must use http or https',
    })
  ),
  uploadSessionId: z.string().uuid().optional().nullable(),
  detectedCoin: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional(),
})

export const validateObservationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'approved', 'rejected']),
  rejectionReason: z.string().max(500).optional(),
})

export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['RESEARCHER', 'ADMIN', 'researcher', 'admin']),
  expiresInHours: z.number().min(1).max(8760).optional().default(168),
})

export const validateInviteSchema = z.object({
  token: z.string().min(1),
})

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export const uploadUrlSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1).max(50),
  sessionId: z.string().uuid().optional(),
  photoIndex: z.number().min(0).max(100).optional(),
})

export const registerFcmTokenSchema = z.object({
  fcmToken: z.string().min(1),
})

export const notifyFcmSchema = z.object({
  userId: z.string().uuid(),
  observationId: z.string().uuid().optional(),
  message: z.string().max(1000).optional(),
})

export const completeOnboardingStepSchema = z.object({
  flowCode: z.string().min(1),
  stepKey: z.string().min(1),
})

export const claimMissionSchema = z.object({
  missionId: z.string().uuid(),
})

export const updateMissionProgressSchema = z.object({
  missionId: z.string().uuid(),
  progress: z.number().min(0),
})
