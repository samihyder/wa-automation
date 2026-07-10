import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/flows/admin-client';

export async function GET() {
  try {
    const ctx = await requireRole('admin');
    const admin = supabaseAdmin();
    const { data: account } = await admin
      .from('accounts')
      .select('integration_settings')
      .eq('id', ctx.accountId)
      .maybeSingle();

    const settings = (account?.integration_settings ?? {}) as Record<string, string>;
    return NextResponse.json({
      flowchatAccountId: settings.flowchat_account_id ?? '',
      syncEnabled: settings.flowchat_sync_enabled === 'true',
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = (await request.json()) as {
      flowchatAccountId?: string;
      syncEnabled?: boolean;
    };

    const admin = supabaseAdmin();
    const { data: account } = await admin
      .from('accounts')
      .select('integration_settings')
      .eq('id', ctx.accountId)
      .maybeSingle();

    const current = (account?.integration_settings ?? {}) as Record<string, string>;
    const next = {
      ...current,
      ...(body.flowchatAccountId !== undefined
        ? { flowchat_account_id: body.flowchatAccountId.trim() }
        : {}),
      ...(body.syncEnabled !== undefined
        ? { flowchat_sync_enabled: body.syncEnabled ? 'true' : 'false' }
        : {}),
    };

    const { error } = await admin
      .from('accounts')
      .update({ integration_settings: next })
      .eq('id', ctx.accountId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
