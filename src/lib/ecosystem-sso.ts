import { createHmac, timingSafeEqual } from 'node:crypto';

export type EcosystemApp = 'wa-automation' | 'lead-monitor';

export type EcosystemSsoPayload = {
  email: string;
  flowchatAccountId: string;
  flowchatUserId: string;
  target: EcosystemApp;
  exp: number;
};

function b64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

function fromB64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function verifyEcosystemToken(
  token: string,
  secret: string,
  expectedTarget: EcosystemApp = 'wa-automation'
): EcosystemSsoPayload | null {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expectedSig = createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: EcosystemSsoPayload;
  try {
    payload = JSON.parse(fromB64url(encoded)) as EcosystemSsoPayload;
  } catch {
    return null;
  }

  if (payload.target !== expectedTarget) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
