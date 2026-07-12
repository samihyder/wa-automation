import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { enrollDripCampaign } from '@/lib/drip-campaigns/runner';

type Params = { params: Promise<{ campaignId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { campaignId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.account_id) {
    return NextResponse.json({ error: 'No account' }, { status: 403 });
  }

  if (!['owner', 'admin', 'agent'].includes(profile.role as string)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: campaign } = await supabase
    .from('drip_campaigns')
    .select('id, account_id')
    .eq('id', campaignId)
    .eq('account_id', profile.account_id)
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
}
