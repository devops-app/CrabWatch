import admin from '../config/firebase'

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
  if (!admin.apps.length) {
    console.warn('FCM not initialized, skipping notification')
    return
  }

  try {
    await admin.messaging().send({
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
    console.error('FCM send error:', error)
    if (error instanceof Error && 'response' in error) {
      const resp = (error as { response?: { body?: string } }).response
      if (resp?.body) {
        const body = JSON.parse(resp.body)
        if (body.error?.status === 'UNREGISTERED') {
          console.warn('FCM token is invalid, should be removed')
        }
      }
    }
  }
}

export async function sendToTopic(
  topic: string,
  payload: PushNotificationPayload
): Promise<void> {
  if (!admin.apps.length) {
    console.warn('FCM not initialized, skipping notification')
    return
  }

  try {
    await admin.messaging().send({
      topic,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    })
  } catch (error: unknown) {
    console.error('FCM topic send error:', error)
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

export async function sendNewSpeciesAlert(
  tokens: string[],
  speciesName: string,
  zone: string
): Promise<void> {
  for (const token of tokens) {
    await sendToToken(token, {
      title: 'New Species Alert',
      body: `A new ${speciesName} observation was recorded in ${zone}.`,
      data: { type: 'new_species', species: speciesName, zone },
    })
  }
}
