import { timingSafeEqual } from 'node:crypto'

/**
 * Verify cron endpoint auth.
 *
 * Accepts either:
 * - `x-cron-secret` header (external pingers, GitHub Actions)
 * - `Authorization: Bearer <secret>` (Vercel Cron — set CRON_SECRET or
 *   AUTOMATION_CRON_SECRET to the same value on Vercel)
 */
export function verifyCronSecret(request: Request): boolean {
  const expected = process.env.AUTOMATION_CRON_SECRET
  if (!expected) return false

  const headerSecret = request.headers.get('x-cron-secret')
  if (headerSecret && safeEqual(headerSecret, expected)) return true

  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const bearer = auth.slice('Bearer '.length)
    const cronSecret = process.env.CRON_SECRET
    if (safeEqual(bearer, expected)) return true
    if (cronSecret && safeEqual(bearer, cronSecret)) return true
  }

  return false
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}
