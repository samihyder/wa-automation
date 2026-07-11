import { NextResponse } from 'next/server'
import { getEncryptionKeyStatus } from '@/lib/whatsapp/encryption'

/**
 * GET /api/health/encryption-key
 * Safe diagnostic — reports whether ENCRYPTION_KEY is visible to the
 * serverless runtime (never returns the key itself).
 */
export async function GET() {
  const status = getEncryptionKeyStatus()
  return NextResponse.json({
    ...status,
    ok: status.valid,
    hint: status.valid
      ? 'ENCRYPTION_KEY is configured correctly on this deployment.'
      : 'Update ENCRYPTION_KEY on Vercel project wa-automation (Production), redeploy, then retry.',
  })
}
