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
  phoneCode: z.string().min(1).max(5),
  phoneNumber: z.string().min(7).max(20),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  state: z.string().min(1).max(100),
  postcode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  password: z.string().min(8),
})
