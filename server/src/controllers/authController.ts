import { Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { Resend } from 'resend'
import admin, { isFirebaseEnabled } from '../config/firebase'
import { getPrisma, getConfig } from '../services/container'
import { AuthRequest } from '../middleware/auth'
import { setAuthCookie } from '../middleware/cookieAuth'
import { requestPasswordResetSchema, resetPasswordSchema } from '../utils/schemas'
import { asyncHandler, UnauthorizedError, ValidationError } from '../utils/errors'
import { createTranslator } from '../middleware/i18n'

let _resend: Resend | null | undefined

function getResend(): Resend | null {
  if (_resend === undefined) {
    const c = getConfig()
    _resend = c.resend.apiKey ? new Resend(c.resend.apiKey) : null
  }
  return _resend
}

function generateJwt(user: { id: string; firebaseUid?: string | null; email: string; name: string | null }) {
  const c = getConfig()
  return jwt.sign(
    { uid: user.firebaseUid || user.id, email: user.email, name: user.name },
    c.jwtSecret,
    { expiresIn: '7d' }
  )
}

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body
  const __ = createTranslator(req)

  const db = getPrisma()
  const user = await db.user.findUnique({
    where: { email },
  })

  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    throw new UnauthorizedError(__('login.invalidCredentials', 'auth'))
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
        await db.user.update({
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
})

export const logout = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.clearCookie('auth_token', { path: '/' })
  res.json({ success: true, data: { loggedOut: true } })
})

export const verifyToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token } = req.body

  let decoded: { uid: string; email?: string; name?: string }

  if (isFirebaseEnabled) {
    try {
      decoded = await admin.auth().verifyIdToken(token)
    } catch {
      decoded = jwt.verify(token, getConfig().jwtSecret) as { uid: string; email?: string; name?: string }
    }
  } else {
    decoded = jwt.verify(token, getConfig().jwtSecret) as { uid: string; email?: string; name?: string }
  }

  res.json({
    success: true,
    data: {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
    },
  })
})

export const requestPasswordReset = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = requestPasswordResetSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten().fieldErrors })
    return
  }

  const __ = createTranslator(req)
  const { email } = parsed.data
  const db = getPrisma()

  const user = await db.user.findUnique({ where: { email } })

  if (!user || user.deletedAt) {
    res.json({ success: true, data: { message: __('passwordReset.requested', 'auth') } })
    return
  }

  await db.passwordReset.deleteMany({ where: { userId: user.id, used: false } })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await db.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  })

  const c2 = getConfig()
  const resetLink = `${c2.frontendUrl}/auth/reset-password?token=${token}`

  const r = getResend()
  if (r) {
    try {
      await r.emails.send({
        from: 'CrabWatch <noreply@crabwatch.dsigncodehub.com>',
        to: email,
        subject: __('passwordReset.email.subject', 'auth'),
        html: `
          <h2>Password Reset Request</h2>
          <p>${__('passwordReset.email.body.click', 'auth')}</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>${__('passwordReset.email.body.expiry', 'auth')}</p>
          <p>${__('passwordReset.email.body.ignore', 'auth')}</p>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError)
    }
  }

  res.json({ success: true, data: { message: __('passwordReset.requested', 'auth') } })
})

export const resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten().fieldErrors })
    return
  }

  const __ = createTranslator(req)
  const { token, password } = parsed.data
  const db = getPrisma()

  const reset = await db.passwordReset.findUnique({ where: { token } })

  if (!reset || reset.used || reset.expiresAt < new Date()) {
    throw new ValidationError(__('passwordReset.tokenInvalid', 'auth'))
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await db.$transaction([
    db.user.update({
      where: { id: reset.userId },
      data: { password: hashedPassword },
    }),
    db.passwordReset.update({
      where: { id: reset.id },
      data: { used: true },
    }),
  ])

  if (isFirebaseEnabled) {
    try {
      const user = await db.user.findUnique({ where: { id: reset.userId } })
      if (user?.firebaseUid) {
        await admin.auth().updateUser(user.firebaseUid, { password })
      }
    } catch (firebaseError) {
      console.error('Firebase password update error:', firebaseError)
    }
  }

  res.json({ success: true, data: { message: __('passwordReset.success', 'auth') } })
})
