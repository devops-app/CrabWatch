import { Response } from 'express'
import crypto from 'crypto'
import { Resend } from 'resend'
import { AuthRequest } from '../middleware/auth'
import { asyncHandler, NotFoundError, ValidationError, ConflictError } from '../utils/errors'
import { getPrisma, getConfig } from '../services/container'
import { createInviteSchema, validateInviteSchema } from '../utils/schemas'

export const createInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = createInviteSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors as any)
  }

  const { email, role, expiresInHours } = parsed.data
  const config = getConfig()
  const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null

  const existingUser = await getPrisma().user.findUnique({ where: { email } })
  if (existingUser && !existingUser.deletedAt) {
    throw new ConflictError('A user with this email already exists')
  }

  const existingInvite = await getPrisma().invite.findUnique({ where: { email } })
  if (existingInvite) {
    await getPrisma().invite.delete({ where: { id: existingInvite.id } })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

  const invite = await getPrisma().invite.create({
    data: {
      email,
      role: role.toUpperCase() as 'RESEARCHER' | 'ADMIN',
      token,
      expiresAt,
    },
  })

  const inviteLink = `${config.frontendUrl}/auth/register?invite=${token}`

  if (resend) {
    try {
      await resend.emails.send({
        from: 'CrabWatch <noreply@crabwatch.dsigncodehub.com>',
        to: email,
        subject: 'You have been invited to CrabWatch',
        html: `
          <h2>Welcome to CrabWatch!</h2>
          <p>You have been invited to join CrabWatch as a <strong>${role.toUpperCase()}</strong>.</p>
          <p>Click the link below to create your account:</p>
          <a href="${inviteLink}">${inviteLink}</a>
          <p>This invite will expire on ${expiresAt.toLocaleDateString()}.</p>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError)
    }
  }

  res.status(201).json({
    success: true,
    data: {
      id: invite.id,
      email: invite.email,
      role: invite.role.toLowerCase(),
      expiresAt: invite.expiresAt.toISOString(),
      inviteLink,
    },
  })
})

export const validateInvite = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const { body } = _req
  const parsed = validateInviteSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors as any)
  }

  const { token } = parsed.data

  const invite = await getPrisma().invite.findUnique({ where: { token } })

  if (!invite) {
    res.json({ success: true, data: { valid: false, error: 'Invalid invite token' } })
    return
  }

  if (invite.used) {
    res.json({ success: true, data: { valid: false, error: 'This invite has already been used' } })
    return
  }

  if (new Date() > new Date(invite.expiresAt)) {
    res.json({ success: true, data: { valid: false, error: 'This invite has expired' } })
    return
  }

  res.json({
    success: true,
    data: {
      valid: true,
      email: invite.email,
      role: invite.role.toLowerCase(),
    },
  })
})

export const listInvites = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const invites = await getPrisma().invite.findMany({
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role.toLowerCase(),
      token: i.token,
      expiresAt: i.expiresAt.toISOString(),
      used: i.used,
      createdAt: i.createdAt.toISOString(),
    })),
  })
})
