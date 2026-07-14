import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  assembleDashboard,
  evaluateTemplateReadiness,
  type FailureRow,
} from '@/lib/drip-campaigns/dashboard';
import type { DripCampaign, DripCampaignStep } from '@/types';

type Params = { params: Promise<{ campaignId: string }> };

/**
 * Lightweight dashboard payload for a drip campaign.
 * Enrollment rows are fetched with a narrow column set (no contact payloads),
 * failures are capped, and template readiness is checked only for step templates.
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { campaignId } = await params;
    const ctx = await requireRole('viewer');

    const { data: campaign, error: campErr } = await ctx.supabase
      .from('drip_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (campErr) {
      return NextResponse.json({ error: campErr.message }, { status: 500 });
    }
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const [
      { data: steps, error: stepsErr },
      { data: enrollmentStatuses },
      { data: failureRows },
    ] = await Promise.all([
      ctx.supabase
        .from('drip_campaign_steps')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('step_order'),
      ctx.supabase
        .from('drip_enrollments')
        .select('status, current_step_index, next_run_at, enrolled_at, last_sent_at')
        .eq('campaign_id', campaignId),
      ctx.supabase
        .from('drip_enrollments')
        .select(
          'id, contact_id, current_step_index, last_error, last_sent_at, enrolled_at, contacts(name, phone)',
        )
        .eq('campaign_id', campaignId)
        .eq('status', 'failed')
        .order('enrolled_at', { ascending: false })
        .limit(50),
    ]);

    if (stepsErr) {
      return NextResponse.json({ error: stepsErr.message }, { status: 500 });
    }

    const stepList = (steps ?? []) as DripCampaignStep[];
    const templatePairs = [
      ...new Map(
        stepList.map((s) => [
          `${s.template_name}::${s.template_language}`,
          { name: s.template_name, language: s.template_language },
        ]),
      ).values(),
    ];

    const templateReadyByKey = new Map<string, { ready: boolean; warning?: string }>();
    if (templatePairs.length) {
      const names = [...new Set(templatePairs.map((p) => p.name))];
      const { data: templates } = await ctx.supabase
        .from('message_templates')
        .select('name, language, status, header_type, header_media_url, header_handle')
        .eq('account_id', ctx.accountId)
        .in('name', names);

      for (const pair of templatePairs) {
        const match = (templates ?? []).find(
          (t) => t.name === pair.name && t.language === pair.language,
        );
        templateReadyByKey.set(
          `${pair.name}::${pair.language}`,
          evaluateTemplateReadiness(match ?? null),
        );
      }
    }

    const failures: FailureRow[] = (failureRows ?? []).map((row) => {
      const raw = row.contacts as
        | { name?: string; phone?: string }
        | { name?: string; phone?: string }[]
        | null;
      const contact = Array.isArray(raw) ? raw[0] : raw;
      return {
        enrollmentId: row.id as string,
        contactId: row.contact_id as string,
        contactName: contact?.name?.trim() || 'Unknown',
        phone: contact?.phone ?? '',
        stepIndex: row.current_step_index as number,
        lastError: (row.last_error as string | null) ?? null,
        lastSentAt: (row.last_sent_at as string | null) ?? null,
        enrolledAt: row.enrolled_at as string,
      };
    });

    const dashboard = assembleDashboard({
      campaign: campaign as DripCampaign,
      steps: stepList,
      enrollmentStatuses: (enrollmentStatuses ?? []) as Array<{
        status: string;
        current_step_index: number;
        next_run_at: string | null;
        enrolled_at: string | null;
        last_sent_at: string | null;
      }>,
      failures,
      templateReadyByKey,
    });

    return NextResponse.json(dashboard, {
      headers: {
        'Cache-Control': 'private, max-age=15',
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
