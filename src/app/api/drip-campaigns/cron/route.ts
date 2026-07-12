import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { processDueDripEnrollments } from '@/lib/drip-campaigns/runner';
import { verifyCronSecret } from '@/lib/cron-auth';

export async function GET(request: Request) {
  if (!process.env.AUTOMATION_CRON_SECRET) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 });
  }
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const result = await processDueDripEnrollments(admin, 40);

  return NextResponse.json(result);
}
