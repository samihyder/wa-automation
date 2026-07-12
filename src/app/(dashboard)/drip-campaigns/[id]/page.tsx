'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchApi } from '@/lib/fetch-api';
import type { DripCampaign, DripCampaignStep } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/10 text-muted-foreground border-slate-500/20',
  active: 'bg-primary/10 text-primary border-primary/20',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function DripCampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<DripCampaign | null>(null);
  const [steps, setSteps] = useState<DripCampaignStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: c } = await supabase
      .from('drip_campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle();
    const { data: s } = await supabase
      .from('drip_campaign_steps')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_order');
    setCampaign((c ?? null) as DripCampaign | null);
    setSteps((s ?? []) as DripCampaignStep[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [campaignId]);

  async function handleActivate() {
    setActivating(true);
    try {
      const res = await fetchApi(`/api/drip-campaigns/${campaignId}/activate`, {
        method: 'POST',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Activation failed');
      toast.success(`Enrolled ${body.enrolled ?? 0} contacts`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate');
    } finally {
      setActivating(false);
    }
  }

  async function handlePauseResume(next: 'paused' | 'active') {
    const supabase = createClient();
    const { error } = await supabase
      .from('drip_campaigns')
      .update({ status: next })
      .eq('id', campaignId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next === 'paused' ? 'Campaign paused' : 'Campaign resumed');
    await load();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">Campaign not found</p>
        <Button variant="outline" onClick={() => router.push('/drip-campaigns')}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/drip-campaigns')}
            className="border-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                  STATUS_STYLES[campaign.status] ?? STATUS_STYLES.draft
                }`}
              >
                {campaign.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {campaign.enrolled_count} enrolled · {campaign.completed_count} completed
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <Button
              disabled={activating}
              onClick={() => void handleActivate()}
              className="bg-primary text-primary-foreground"
            >
              {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start & enroll
            </Button>
          )}
          {campaign.status === 'active' && (
            <Button variant="outline" onClick={() => void handlePauseResume('paused')}>
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          {campaign.status === 'paused' && (
            <Button onClick={() => void handlePauseResume('active')}>
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{campaign.enrolled_count}</p>
          <p className="text-xs text-muted-foreground">Enrolled</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{campaign.completed_count}</p>
          <p className="text-xs text-muted-foreground">Completed sequence</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{steps.length}</p>
          <p className="text-xs text-muted-foreground">Steps</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="px-4 py-3 text-sm font-medium text-foreground">Sequence</div>
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Step {i + 1}
                {step.name ? `: ${step.name}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {step.template_name} ({step.template_language})
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {i === 0 ? 'On enroll' : `+${step.delay_hours}h after previous`}
            </span>
          </div>
        ))}
      </div>

      {campaign.status === 'active' && (
        <p className="text-xs text-muted-foreground">
          Due enrollments are processed every 5 minutes via the drip cron job.
        </p>
      )}
    </div>
  );
}
