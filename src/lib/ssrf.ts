// src/lib/ssrf.ts
// SSRF protection: validates that a URL does not resolve to a private/loopback IP.
// Called before any user-supplied URL is fetched (webhook delivery, etc.).

import { promises as dns } from 'dns'

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.')
  if (parts.length !== 4) return -1
  return parts.reduce((acc, part) => {
    const n = parseInt(part, 10)
    if (isNaN(n) || n < 0 || n > 255) return -1
    return (acc << 8) | n
  }, 0) >>> 0  // unsigned right shift to get unsigned 32-bit
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n < 0) return true  // malformed = reject
  // 127.0.0.0/8
  if ((n >>> 24) === 127) return true
  // 10.0.0.0/8
  if ((n >>> 24) === 10) return true
  // 172.16.0.0/12
  if ((n >>> 20) === (172 << 4 | 1)) return true
  // 192.168.0.0/16
  if ((n >>> 16) === ((192 << 8) | 168)) return true
  // 169.254.0.0/16 (link-local / cloud metadata endpoint)
  if ((n >>> 16) === ((169 << 8) | 254)) return true
  // 0.0.0.0
  if (n === 0) return true
  return false
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (lower === '::1') return true          // loopback
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true  // ULA fc00::/7
  if (lower.startsWith('fe8') || lower.startsWith('fe9') ||
      lower.startsWith('fea') || lower.startsWith('feb')) return true  // link-local fe80::/10
  // IPv4-mapped IPv6: ::ffff:192.168.x.x
  const v4mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4mapped && v4mapped[1]) return isPrivateIpv4(v4mapped[1])
  return false
}

export function isPrivateIp(ip: string): boolean {
  // Detect IPv6 by presence of colon
  return ip.includes(':') ? isPrivateIpv6(ip) : isPrivateIpv4(ip)
}

export async function validateSsrf(rawUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error(`[ssrf] Invalid URL: ${rawUrl}`)
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`[ssrf] Rejected non-HTTP(S) scheme: ${parsed.protocol}`)
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '')  // strip IPv6 brackets

  // If hostname is already a raw IP, check it directly
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) {
    if (isPrivateIp(hostname)) {
      throw new Error(`[ssrf] Rejected private/loopback IP: ${hostname}`)
    }
    return
  }

  // Resolve DNS and check all returned addresses
  let addresses: { address: string; family: number }[]
  try {
    // lookup resolves to a single address; use resolve for all
    const result = await dns.lookup(hostname, { all: true })
    addresses = result
  } catch (err) {
    throw new Error(`[ssrf] DNS resolution failed for ${hostname}: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (addresses.length === 0) {
    throw new Error(`[ssrf] DNS resolution returned no addresses for ${hostname}`)
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error(`[ssrf] Rejected: ${hostname} resolves to private/loopback IP ${address}`)
    }
  }
}
