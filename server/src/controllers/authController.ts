import { Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { Resend } from 'resend'
import admin, { isFirebaseEnabled } from '../config/firebase'
import prisma from '../config/database'
import { config } from '../config'
import { AuthRequest } from '../middleware/auth'
import { setAuthCookie } from '../middleware/cookieAuth'
import { requestPasswordResetSchema, resetPasswordSchema } from '../utils/schemas'

const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null

function generateJwt(user: { id: string; firebaseUid?: string | null; email: string; name: string | null }) {
  return jwt.sign(
    { uid: user.firebaseUid || user.id, email: user.email, name: user.name },
    config.jwtSecret,
    { expiresIn: '7d' }
  )
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    let token: string

    if (isFirebaseEnabled) {
      let firebaseUid = user.firebaseUid

      if (!firebaseUid) {
        try {
          const newUser = await admin.auth().createUser({
            email,
            displayName: user.name,
          })
          firebaseUid = newUser.uid
          await prisma.user.update({
            where: { id: user.id },
            data: { firebaseUid },
          })
        } catch (createError: unknown) {
          const err = createError instanceof Error ? createError : new Error(String(createError))
          console.error('Firebase createUser error:', err.message)
        }
      }

      token = generateJwt(user)
    } else {
      token = generateJwt(user)
    }

    setAuthCookie(res, token)

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneCode: user.phoneCode,
          phoneNumber: user.phoneNumber,
          addressLine1: user.addressLine1,
          addressLine2: user.addressLine2,
          addressLine3: user.addressLine3,
          state: user.state,
          postcode: user.postcode,
          country: user.country,
          role: user.role.toLowerCase(),
        },
      },
    })
  } catch (error: unknown) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: 'Login failed' })
  }
}

export async function logout(_req: AuthRequest, res: Response): Promise<void> {
  res.clearCookie('auth_token', { path: '/' })
  res.json({ success: true, data: { loggedOut: true } })
}

export async function verifyToken(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { token } = req.body

    let decoded: { uid: string; email?: string; name?: string }

    if (isFirebaseEnabled) {
      try {
        decoded = await admin.auth().verifyIdToken(token)
      } catch {
        decoded = jwt.verify(token, config.jwtSecret) as { uid: string; email?: string; name?: string }
      }
    } else {
      decoded = jwt.verify(token, config.jwtSecret) as { uid: string; email?: string; name?: string }
    }

    res.json({
      success: true,
      data: {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
      },
    })
  } catch (error: unknown) {
    console.error('Verify token error:', error)
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

export async function requestPasswordReset(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = requestPasswordResetSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten().fieldErrors })
      return
    }

    const { email } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || user.deletedAt) {
      res.json({ success: true, data: { message: 'If the email exists, a reset link has been sent' } })
      return
    }

    await prisma.passwordReset.deleteMany({ where: { userId: user.id, used: false } })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    const resetLink = `${config.frontendUrl}/auth/reset-password?token=${token}`

    if (resend) {
      try {
        await resend.emails.send({
          from: 'CrabWatch <onboarding@resend.dev>',
          to: email,
          subject: 'Reset Your CrabWatch Password',
          html: `
            <h2>Password Reset Request</h2>
            <p>You requested to reset your CrabWatch password. Click the link below to set a new password:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, you can safely ignore this email.</p>
          `,
        })
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError)
      }
    }

    res.json({ success: true, data: { message: 'If the email exists, a reset link has been sent' } })
  } catch (error: unknown) {
    console.error('Request password reset error:', error)
    res.status(500).json({ success: false, error: 'Failed to process password reset request' })
  }
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten().fieldErrors })
      return
    }

    const { token, password } = parsed.data

    const reset = await prisma.passwordReset.findUnique({ where: { token } })

    if (!reset || reset.used || reset.expiresAt < new Date()) {
      res.status(400).json({ success: false, error: 'Invalid or expired reset token' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      }),
    ])

    if (isFirebaseEnabled) {
      try {
        const user = await prisma.user.findUnique({ where: { id: reset.userId } })
        if (user?.firebaseUid) {
          await admin.auth().updateUser(user.firebaseUid, { password })
        }
      } catch (firebaseError) {
        console.error('Firebase password update error:', firebaseError)
      }
    }

    res.json({ success: true, data: { message: 'Password has been reset successfully' } })
  } catch (error: unknown) {
    console.error('Reset password error:', error)
    res.status(500).json({ success: false, error: 'Failed to reset password' })
  }
}
