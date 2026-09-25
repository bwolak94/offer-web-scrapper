// src/notify/email.ts
// Sends notification emails via Resend.
// Resend client is instantiated lazily inside the function to avoid build-time failures.

import { Resend } from 'resend'
import { env } from '@/lib/env'
import type { Watch, ListingPublic, JobPublic } from '@/types'

// Prevent HTML injection from scraped titles/descriptions entering the email body.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Only allow https/http URLs in href to prevent javascript:/data: injection.
function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : '#'
}

export async function sendEmailNotification(
  watch: Watch,
  item: ListingPublic | JobPublic
): Promise<void> {
  if (!watch.notifyEmail) return

  // Lazy instantiation — avoids module-load failure when RESEND_API_KEY is absent
  // during Next.js build phase (same pattern as other lazy singletons in this project)
  const resend = new Resend(env.RESEND_API_KEY)

  const itemTitle = escapeHtml(item.title)
  const subject   = `New match for your watch: ${item.title.slice(0, 100)}`

  const scoreSection = item.aiScore != null
    ? `<p><strong>AI Score:</strong> ${item.aiScore}/100</p>`
    : ''

  const descriptionSection = 'description' in item && item.description
    ? `<p><strong>Description:</strong> ${escapeHtml(item.description.slice(0, 300))}...</p>`
    : ''

  const html = `
    <h2>New Offer Match</h2>
    <p><strong>Title:</strong> ${itemTitle}</p>
    ${scoreSection}
    ${descriptionSection}
    <p><a href="${safeHref(item.url)}">View Offer</a></p>
    <hr />
    <p style="color:#888;font-size:12px;">
      You are receiving this because of a watch you created.
      Watch ID: ${watch.id}
    </p>
  `.trim()

  // Strip control characters (CRLF, null bytes) to prevent email header injection.
  // Zod validates the email format but does not sanitize the string.
  const safeEmail = watch.notifyEmail.replace(/[\r\n\0]/g, '')

  await resend.emails.send({
    from:    env.RESEND_FROM_EMAIL,
    to:      safeEmail,
    subject,
    html,
  })
}
