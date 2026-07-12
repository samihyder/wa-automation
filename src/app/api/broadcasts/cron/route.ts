import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { executeBroadcastSend } from '@/lib/broadcasts/execute-broadcast';
import { verifyCronSecret } from '@/lib/cron-auth';

/**
 * Process due scheduled broadcasts.
 * Vercel Cron: every 5 minutes (see vercel.json).
 */
export async function GET(request: Request) {
  if (!process.env.AUTOMATION_CRON_SECRET) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 });
  }
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const now = new Date().toISOString();

  const { data: due, error } = await admin
    .from('broadcasts')
    .select('id, name, scheduled_at')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ processed: 0, broadcasts: [] });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const row of due) {
    const result = await executeBroadcastSend(admin, row.id as string);
    results.push({ id: row.id as string, ok: result.ok, error: result.error });
  }

  return NextResponse.json({
    processed: results.length,
    broadcasts: results,
  });
}
