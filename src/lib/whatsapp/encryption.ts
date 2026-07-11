import crypto from 'crypto'

/**
 * WhatsApp token encryption.
 *
 * Format — GCM (current):
 *   `<iv-hex>:<ciphertext-hex>:<authTag-hex>`      (three colons)
 *
 * Format — CBC (legacy, decrypt-only):
 *   `<iv-hex>:<ciphertext-hex>`                    (one colon)
 *
 * ENCRYPTION_KEY is read at call time (not module load) so Vercel
 * runtime env vars are picked up after deploy without a stale build-time
 * capture.
 */

const GCM_IV_LENGTH = 12
const CBC_IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/** Normalize env value — strip whitespace/quotes sometimes pasted by mistake. */
function normalizeEncryptionKeyRaw(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/^["']|["']$/g, '').replace(/\s/g, '')
}

export function getEncryptionKeyStatus(): {
  present: boolean
  length: number
  valid: boolean
} {
  const raw = normalizeEncryptionKeyRaw(process.env.ENCRYPTION_KEY)
  return {
    present: raw.length > 0,
    length: raw.length,
    valid: /^[0-9a-fA-F]{64}$/.test(raw),
  }
}

function encryptionKeyBuffer(): Buffer {
  const raw = normalizeEncryptionKeyRaw(process.env.ENCRYPTION_KEY)
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    const status = getEncryptionKeyStatus()
    throw new Error(
      `ENCRYPTION_KEY invalid on server (present=${status.present}, length=${status.length}, valid=${status.valid}). ` +
        'Set a 64-character hex string on Vercel project wa-automation → Environment Variables → Production, then redeploy.'
    )
  }
  return Buffer.from(raw, 'hex')
}

export function encrypt(text: string): string {
  const key = encryptionKeyBuffer()
  const iv = crypto.randomBytes(GCM_IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`
}

export function decrypt(encryptedText: string): string {
  const key = encryptionKeyBuffer()
  const parts = encryptedText.split(':')

  if (parts.length === 3) {
    const [ivHex, ctHex, tagHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== GCM_IV_LENGTH) {
      throw new Error(
        `Encrypted token has unexpected GCM IV length ${iv.length}`,
      )
    }
    const authTag = Buffer.from(tagHex, 'hex')
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(
        `Encrypted token has unexpected GCM auth-tag length ${authTag.length}`,
      )
    }
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ctHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  if (parts.length === 2) {
    const [ivHex, ctHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== CBC_IV_LENGTH) {
      throw new Error(
        `Encrypted token has unexpected CBC IV length ${iv.length}`,
      )
    }
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(ctHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  throw new Error(
    `Encrypted token has unrecognised format (expected 1 or 2 colons, got ${
      parts.length - 1
    })`,
  )
}

export function isLegacyFormat(encryptedText: string): boolean {
  return encryptedText.split(':').length === 2
}
