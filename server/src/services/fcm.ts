import { getContainer } from './container'
import logger from '../utils/logger'
import type { MulticastMessage } from 'firebase-admin/messaging'

export interface PushNotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
  badge?: number
  clickAction?: string
}

export interface FcmTokenRecord {
  userId: string
  token: string
  createdAt: Date
}

export async function sendToToken(
  fcmToken: string,
  payload: PushNotificationPayload
): Promise<void> {
  if (!getContainer().firebase.apps.length) {
    logger.warn('FCM not initialized, skipping notification')
    return
  }

  try {
    await getContainer().firebase.messaging().send({
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        notification: {
          channelId: payload.clickAction || 'crabwatch',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: payload.badge || 1,
          },
        },
      },
    })
  } catch (error: unknown) {
    logger.error({ err: error }, 'FCM send error')
    if (error instanceof Error && 'response' in error) {
      const resp = (error as { response?: { body?: string } }).response
      if (resp?.body) {
        const body = JSON.parse(resp.body)
        if (body.error?.status === 'UNREGISTERED') {
          logger.warn({ fcmToken }, 'FCM token is invalid, should be removed')
        }
      }
    }
  }
}

export async function sendToTopic(
  topic: string,
  payload: PushNotificationPayload
): Promise<void> {
  if (!getContainer().firebase.apps.length) {
    logger.warn('FCM not initialized, skipping notification')
    return
  }

  try {
    await getContainer().firebase.messaging().send({
      topic,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    })
  } catch (error: unknown) {
    logger.error({ err: error, topic }, 'FCM topic send error')
  }
}

export async function sendObservationApproved(
  recipientToken: string,
  speciesName: string
): Promise<void> {
  await sendToToken(recipientToken, {
    title: 'Observation Approved',
    body: `Your ${speciesName} observation has been validated by a researcher.`,
    data: { type: 'observation_approved' },
    badge: 1,
  })
}

export async function sendObservationRejected(
  recipientToken: string,
  speciesName: string,
  reason: string
): Promise<void> {
  await sendToToken(recipientToken, {
    title: 'Observation Rejected',
    body: `Your ${speciesName} observation was rejected: ${reason}`,
    data: { type: 'observation_rejected' },
  })
}

/** FCM multicast batch limit (provider-supported max tokens per call). */
const FCM_MULTICAST_BATCH = 500

export interface FcmBroadcastResult {
  requested: number
  successful: number
  failed: number
  /** Tokens FCM reported as unregistered/invalid (candidates for removal). */
  invalidTokens: string[]
}

/**
 * Broadcasts a new-species alert to many devices using FCM's multicast API.
 * Tokens are split into provider-supported batches (500) and sent with
 * `sendEachForMulticast`, which handles per-message delivery and returns a
 * per-token result so partial failures and invalid tokens can be reported.
 */
export async function sendNewSpeciesAlert(
  tokens: string[],
  speciesName: string,
  zone: string
): Promise<FcmBroadcastResult> {
  const result: FcmBroadcastResult = {
    requested: tokens.length,
    successful: 0,
    failed: 0,
    invalidTokens: [],
  }

  if (tokens.length === 0) return result

  if (!getContainer().firebase.apps.length) {
    logger.warn('FCM not initialized, skipping new-species broadcast')
    result.failed = tokens.length
    return result
  }

  const messaging = getContainer().firebase.messaging()

  for (let i = 0; i < tokens.length; i += FCM_MULTICAST_BATCH) {
    const batch = tokens.slice(i, i + FCM_MULTICAST_BATCH)

    // sendEachForMulticast takes a single MulticastMessage: the shared message
    // fields (notification/data/platform config) plus the list of tokens to
    // fan out to.
    const multicastMessage: MulticastMessage = {
      tokens: batch,
      notification: {
        title: 'New Species Alert',
        body: `A new ${speciesName} observation was recorded in ${zone}.`,
      },
      data: { type: 'new_species', species: speciesName, zone },
      android: { notification: { channelId: 'crabwatch' } },
      apns: { payload: { aps: { badge: 1 } } },
    }

    try {
      const response = await messaging.sendEachForMulticast(multicastMessage)
      response.responses.forEach((r, idx) => {
        if (r.success) {
          result.successful++
        } else {
          result.failed++
          if (isUnregisteredTokenError(r.error)) {
            result.invalidTokens.push(batch[idx])
          }
        }
      })
    } catch (error: unknown) {
      // A whole batch failing (e.g. transient outage) is recorded as failed;
      // we do not treat it as invalid tokens.
      logger.error({ err: error, batchSize: batch.length }, 'FCM multicast batch error')
      result.failed += batch.length
    }
  }

  return result
}

function isUnregisteredTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code ?? ''
  if (
    code.includes('registration-token-not-registered') ||
    code.includes('invalid-registration-token') ||
    code.includes('messaging/registration-token-not-registered')
  ) {
    return true
  }
  // A direct messaging().send() error surfaces the FCM HTTP body on .response.
  const resp = (error as { response?: { body?: string } }).response
  if (resp?.body) {
    try {
      const body = JSON.parse(resp.body)
      if (body.error?.status === 'UNREGISTERED') return true
    } catch {
      /* non-JSON body — not an unregistered-token error */
    }
  }
  return false
}

export interface FcmSendResult {
  requested: number
  successful: number
  failed: number
  /** Tokens FCM reported as unregistered/invalid (candidates for removal). */
  invalidTokens: string[]
}

/**
 * Sends a single notification to a list of device tokens using the container's
 * firebase instance (K1: consolidates the ad-hoc `await import('firebase-admin')`
 * path in notificationService onto this module). Returns per-token results so
 * callers can clean up unregistered tokens.
 */
export async function sendToTokens(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<FcmSendResult> {
  const result: FcmSendResult = {
    requested: tokens.length,
    successful: 0,
    failed: 0,
    invalidTokens: [],
  }

  if (tokens.length === 0) return result

  if (!getContainer().firebase.apps.length) {
    logger.warn('FCM not initialized, skipping notification')
    result.failed = tokens.length
    return result
  }

  const messaging = getContainer().firebase.messaging()
  for (const token of tokens) {
    try {
      await messaging.send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        android: {
          notification: {
            channelId: payload.clickAction || 'crabwatch',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: payload.badge || 1,
            },
          },
        },
      })
      result.successful++
    } catch (error: unknown) {
      result.failed++
      if (isUnregisteredTokenError(error)) {
        result.invalidTokens.push(token)
        logger.warn({ token }, 'FCM token is invalid, should be removed')
      } else {
        logger.error({ err: error, token }, 'Failed to send push to token')
      }
    }
  }

  return result
}
