import { z } from 'zod'
import { loginSchemaBase, registerSchemaBase } from '@crabwatch/shared'

const hasAtMostTwoDecimals = (value: number): boolean => {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-8
}

export const loginSchema = loginSchemaBase

export const registerSchema = registerSchemaBase
  .extend({
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    consentAccepted: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the consent terms to register' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const observationSchema = z.object({
  speciesId: z.string().min(1, 'Please select a species'),
  cw: z.number()
    .positive('Carapace width must be positive')
    .max(50, 'Maximum carapace width is 50 cm')
    .refine(hasAtMostTwoDecimals, 'Carapace width supports up to 2 decimal places'),
  bw: z.number()
    .positive('Body weight must be positive')
    .max(5000, 'Maximum body weight is 5000 g')
    .refine(hasAtMostTwoDecimals, 'Body weight supports up to 2 decimal places')
    .optional(),
  gender: z.enum(['male', 'female', 'unknown'], {
    errorMap: () => ({ message: 'Please select the gender' }),
  }),
  maturationStatus: z.enum(['mature', 'immature', 'unknown'], {
    errorMap: () => ({ message: 'Please select maturation status' }),
  }),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  locationMethod: z.enum(['gps', 'manual']),
  photos: z.array(z.string()).min(1, 'At least one photo is required').max(5, 'Maximum 5 photos'),
  detectedCoin: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional(),
})

export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  avatar: z.string().url('Invalid avatar URL').nullable().optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type ObservationFormValues = z.infer<typeof observationSchema>
export type ProfileFormValues = z.infer<typeof profileSchema>
