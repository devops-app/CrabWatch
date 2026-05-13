import { Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import admin, { isFirebaseEnabled } from '../config/firebase'
import prisma from '../config/database'
import { config } from '../config'
import { AuthRequest } from '../middleware/auth'
import { setAuthCookie } from '../middleware/cookieAuth'

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
