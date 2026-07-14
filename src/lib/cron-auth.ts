import { timingSafeEqual } from 'node:crypto'

/**
 * Verify cron endpoint auth.
 *
 * Accepts either:
 * - `x-cron-secret` header (external pingers, GitHub Actions)
 * - `Authorization: Bearer <secret>` (Vercel Cron)
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Set
 * `CRON_SECRET` on Vercel to the same value as `AUTOMATION_CRON_SECRET`,
 * or set only `AUTOMATION_CRON_SECRET` and also put that value in
 * `CRON_SECRET` so Vercel’s auto-invokes authenticate.
 */
export function verifyCronSecret(request: Request): boolean {
  const expected = process.env.AUTOMATION_CRON_SECRET || process.env.CRON_SECRET
  if (!expected) return false

  const headerSecret = request.headers.get('x-cron-secret')
  if (headerSecret && safeEqual(headerSecret, expected)) return true

  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const bearer = auth.slice('Bearer '.length)
    if (safeEqual(bearer, expected)) return true
    const cronSecret = process.env.CRON_SECRET
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
