// src/notify/index.ts
// Dispatch a notification for a single (watch, item) pair.
// Each channel is claimed atomically via INSERT ... ON CONFLICT DO NOTHING RETURNING id.
// Only the worker that wins the INSERT race dispatches — eliminates duplicate delivery
// even when multiple QStash workers process the same event concurrently.

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
  const refId   = item.id
  const channels: Array<'email' | 'webhook'> = []
  if (watch.notifyEmail)   channels.push('email')
  if (watch.notifyWebhook) channels.push('webhook')
  if (channels.length === 0) return

  for (const channel of channels) {
    // Atomically claim this (watch, ref, channel) slot.
    // If another worker already claimed it (ON CONFLICT), skip dispatch.
    const rows = await db
      .insert(notificationLog)
      .values({ watch_id: watch.id, ref_id: refId, ref_type: refType, channel })
      .onConflictDoNothing()
      .returning({ id: notificationLog.id })

    if (rows.length === 0) continue  // already claimed by another worker

    // We own this slot — dispatch
    try {
      if (channel === 'email') {
        await sendEmailNotification(watch, item)
      } else {
        await sendWebhookNotification(watch, item)
      }
    } catch (err) {
      console.error('[notify] Dispatch failed', {
        channel,
        watchId: watch.id,
        refId,
        err: err instanceof Error ? err.message : String(err),
      })
      // Row stays in notification_log — intentional: prevents retry flooding
      // within the 24h dedup window even on delivery failure.
    }
  }
}
