import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.FLOWCHAT_WEBHOOK_SECRET ?? process.env.MUTEX_ECOSYSTEM_SSO_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('X-FlowChat-Signature');
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    event: string;
    accountId: string;
    payload: { contact?: { id: string; phone?: string; name?: string; email?: string } };
  };

  const contact = payload.payload?.contact;
  if (!contact?.phone || !payload.event.startsWith('contact.')) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const admin = supabaseAdmin();
  const { data: accounts } = await admin
    .from('accounts')
    .select('id, owner_user_id, integration_settings');

  const mapping = (accounts ?? []).find((row) => {
    const settings = (row.integration_settings ?? {}) as Record<string, string>;
    return settings.flowchat_account_id === payload.accountId;
  });

  if (!mapping?.id) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no_account_mapping' });
  }

  const accountId = mapping.id as string;
  const ownerUserId = mapping.owner_user_id as string;

  const { data: existing } = await admin
    .from('contacts')
    .select('id')
    .eq('account_id', accountId)
    .eq('flowchat_contact_id', contact.id)
    .maybeSingle();

  if (existing) {
    await admin
      .from('contacts')
      .update({
        name: contact.name ?? undefined,
        email: contact.email ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    return NextResponse.json({ ok: true, updated: true });
  }

  await admin.from('contacts').insert({
    account_id: accountId,
    user_id: ownerUserId,
    phone: contact.phone,
    name: contact.name ?? contact.phone,
    email: contact.email ?? null,
    flowchat_contact_id: contact.id,
  });

  return NextResponse.json({ ok: true, created: true });
}
