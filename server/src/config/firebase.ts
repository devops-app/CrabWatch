import admin from 'firebase-admin'
import { config } from '../config'
import logger from '../utils/logger'

const firebaseEnabled = config.firebase.projectId && config.firebase.projectId !== 'your-project-id'

if (firebaseEnabled && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    })
  } catch (initError: unknown) {
    const err = initError instanceof Error ? initError : new Error(String(initError))
    logger.error({ err: err.message }, 'Firebase Admin init error')
  }
}

export const isFirebaseEnabled = firebaseEnabled
export default admin
