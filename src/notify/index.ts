// src/notify/index.ts
// Dispatch a notification for a single (watch, item) pair.
// Calls email + webhook independently — one failure doesn't suppress the other.
// Inserts to notification_log with onConflictDoNothing() for dedup safety.

import { db } from '@/db/index'
import { notificationLog } from '@/db/schema'
import { sendEmailNotification } from './email'
import { sendWebhookNotification } from './webhook'
import type { Watch, ListingPublic, JobPublic } from '@/types'
import type { RefType } from '@/types'

export async function sendNotification(
  watch:   Watch,
  item:    ListingPublic | JobPublic,
  refType: RefType
): Promise<void> {
  const refId = item.id

  // Fire email + webhook independently — failures are logged but don't block each other
  const emailResult   = watch.notifyEmail   ? sendEmailNotification(watch, item)   : Promise.resolve()
  const webhookResult = watch.notifyWebhook ? sendWebhookNotification(watch, item) : Promise.resolve()

  const [emailSettled, webhookSettled] = await Promise.allSettled([emailResult, webhookResult])

  if (emailSettled.status === 'rejected') {
    console.error('[notify] Email dispatch failed', { watchId: watch.id, refId, err: emailSettled.reason })
  }

  if (webhookSettled.status === 'rejected') {
    console.error('[notify] Webhook dispatch failed', { watchId: watch.id, refId, err: webhookSettled.reason })
  }

  // Record channels that attempted delivery (even partial failures)
  // onConflictDoNothing prevents duplicate rows on QStash retries
  const insertRows: Array<{ watch_id: string; ref_id: string; ref_type: RefType; channel: 'email' | 'webhook' }> = []

  if (watch.notifyEmail) {
    insertRows.push({ watch_id: watch.id, ref_id: refId, ref_type: refType, channel: 'email' })
  }
  if (watch.notifyWebhook) {
    insertRows.push({ watch_id: watch.id, ref_id: refId, ref_type: refType, channel: 'webhook' })
  }

  if (insertRows.length > 0) {
    await db
      .insert(notificationLog)
      .values(insertRows)
      .onConflictDoNothing()
  }
}
