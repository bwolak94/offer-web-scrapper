// src/notify/webhook.ts
// Sends notification payloads to user-configured webhook URLs.

import type { Watch, ListingPublic, JobPublic } from '@/types'
import { validateSsrf } from '@/lib/ssrf'

export async function sendWebhookNotification(
  watch: Watch,
  item: ListingPublic | JobPublic
): Promise<void> {
  if (!watch.notifyWebhook) return

  // SSRF protection: reject private/loopback IPs before fetching.
  await validateSsrf(watch.notifyWebhook)

  // Strip internal pipeline fields before sending to an external party.
  // content_hash, score_status, scraped_at, updated_at reveal infrastructure details.
  const { contentHash: _ch, scoreStatus: _ss, scrapedAt: _sa, updatedAt: _ua, ...publicItem } =
    item as Record<string, unknown> & typeof item

  const payload = {
    watchId: watch.id,
    type:    watch.type,
    item:    publicItem,
    sentAt:  new Date().toISOString(),
  }

  // redirect: 'error' prevents open-redirect pivots to internal endpoints.
  const res = await fetch(watch.notifyWebhook, {
    method:   'POST',
    signal:   AbortSignal.timeout(10_000),
    redirect: 'error',
    headers:  { 'Content-Type': 'application/json' },
    body:     JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `[webhook] Webhook delivery failed (${res.status}): ${body.slice(0, 200)}`
    )
  }
}
