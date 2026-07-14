import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { enrollDripCampaign } from '@/lib/drip-campaigns/runner';

type Params = { params: Promise<{ campaignId: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { campaignId } = await params;
    // Agent+ can start drips (same bar as sending messages / broadcasts).
    // Uses account_role — NOT the legacy profiles.role column.
    const ctx = await requireRole('agent');

    const { data: campaign } = await ctx.supabase
      .from('drip_campaigns')
      .select('id, account_id')
      .eq('id', campaignId)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const admin = supabaseAdmin();
    const result = await enrollDripCampaign(admin, campaignId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, enrolled: result.enrolled });
  } catch (err) {
    return toErrorResponse(err);
  }
}
