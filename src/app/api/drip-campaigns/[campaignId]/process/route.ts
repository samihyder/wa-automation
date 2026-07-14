import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { processDueDripEnrollments } from '@/lib/drip-campaigns/runner';

type Params = { params: Promise<{ campaignId: string }> };

/**
 * Manually drain due enrollments for this campaign (agent+).
 * Useful when cron is delayed or misconfigured.
 */
export async function POST(_req: Request, { params }: Params) {
  try {
    const { campaignId } = await params;
    const ctx = await requireRole('agent');

    const { data: campaign } = await ctx.supabase
      .from('drip_campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.status !== 'active' && campaign.status !== 'paused') {
      return NextResponse.json(
        { error: 'Campaign must be active (or paused) to process due steps' },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin();
    const result = await processDueDripEnrollments(admin, 50, { campaignId });

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      errors: result.errors.slice(0, 10),
      errorCount: result.errors.length,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
