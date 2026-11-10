import { z } from 'zod'

export const emailSchema = z.string().email()
export const passwordSchema = z.string().min(6)

export const loginSchemaBase = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const registerSchemaBase = z.object({
  name: z.string().min(1).max(100),
  email: emailSchema,
  phoneCode: z.string().max(5).optional(),
  phoneNumber: z.string().min(7).max(20).optional().or(z.literal('')),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  state: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  password: z.string().min(8),
})
