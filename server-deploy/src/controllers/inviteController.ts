import { Response } from 'express'
import crypto from 'crypto'
import { Resend } from 'resend'
import prisma from '../config/database'
import { config } from '../config'
import { AuthRequest } from '../middleware/auth'
import { createInviteSchema, validateInviteSchema } from '../utils/schemas'

const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null

export async function createInvite(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = createInviteSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten().fieldErrors })
      return
    }

    const { email, role, expiresInHours } = parsed.data

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser && !existingUser.deletedAt) {
      res.status(400).json({ success: false, error: 'A user with this email already exists' })
      return
    }

    const existingInvite = await prisma.invite.findUnique({ where: { email } })
    if (existingInvite) {
      await prisma.invite.delete({ where: { id: existingInvite.id } })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

    const invite = await prisma.invite.create({
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
          from: 'CrabWatch <onboarding@resend.dev>',
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
  } catch (error: unknown) {
    console.error('Create invite error:', error)
    res.status(500).json({ success: false, error: 'Failed to create invite' })
  }
}

export async function validateInvite(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = validateInviteSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten().fieldErrors })
      return
    }

    const { token } = parsed.data

    const invite = await prisma.invite.findUnique({ where: { token } })

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
  } catch (error: unknown) {
    console.error('Validate invite error:', error)
    res.status(500).json({ success: false, error: 'Failed to validate invite' })
  }
}

export async function listInvites(req: AuthRequest, res: Response): Promise<void> {
  try {
    const invites = await prisma.invite.findMany({
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
  } catch (error: unknown) {
    console.error('List invites error:', error)
    res.status(500).json({ success: false, error: 'Failed to list invites' })
  }
}
