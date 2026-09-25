// src/notify/webhook.ts
// Sends notification payloads to user-configured webhook URLs.

import type { Watch, ListingPublic, JobPublic } from '@/types'

export async function sendWebhookNotification(
  watch: Watch,
  item: ListingPublic | JobPublic
): Promise<void> {
  if (!watch.notifyWebhook) return

  const payload = {
    watchId: watch.id,
    type:    watch.type,
    item,
    sentAt:  new Date().toISOString(),
  }

  // redirect: 'error' prevents open-redirect pivots to internal endpoints.
  // Full SSRF protection (IP blocklist) is implemented in DEVOPS-05 — do not
  // promote to production until validateSsrf() is wired in from @/lib/ssrf.
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
