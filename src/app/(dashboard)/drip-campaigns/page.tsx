'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { DripCampaign } from '@/types';
import { GatedButton } from '@/components/ui/gated-button';
import { useCan } from '@/hooks/use-can';
import { Loader2, Plus, Repeat } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/10 text-muted-foreground border-slate-500/20',
  active: 'bg-primary/10 text-primary border-primary/20',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

type CampaignHealth = {
  active: number;
  failed: number;
  completed: number;
  cancelled: number;
  total: number;
};

function audienceLabel(filter: Record<string, unknown> | null | undefined): string {
  if (!filter || typeof filter !== 'object') return 'All contacts';
  const type = typeof filter.type === 'string' ? filter.type : 'all';
  if (type === 'tags') {
    const n = Array.isArray(filter.tagIds) ? filter.tagIds.length : 0;
    return `Tags (${n})`;
  }
  if (type === 'custom_field') return 'Custom field';
  if (type === 'csv') {
    const n = Array.isArray(filter.csvContacts) ? filter.csvContacts.length : 0;
    return `CSV (${n})`;
  }
  return 'All contacts';
}

export default function DripCampaignsPage() {
  const router = useRouter();
  const canCreate = useCan('send-messages');
  const [campaigns, setCampaigns] = useState<DripCampaign[]>([]);
  const [healthById, setHealthById] = useState<Record<string, CampaignHealth>>({});
  const [loading, setLoading] = useState(true);
  const [loadMs, setLoadMs] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const started = performance.now();
      const supabase = createClient();
      const { data } = await supabase
        .from('drip_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      const list = (data ?? []) as DripCampaign[];
      setCampaigns(list);

      if (list.length) {
        const ids = list.map((c) => c.id);
        // Narrow columns only — one round-trip for all list chips.
        const { data: enrollments } = await supabase
          .from('drip_enrollments')
          .select('campaign_id, status')
          .in('campaign_id', ids);

        const next: Record<string, CampaignHealth> = {};
        for (const id of ids) {
          next[id] = { active: 0, failed: 0, completed: 0, cancelled: 0, total: 0 };
        }
        for (const row of enrollments ?? []) {
          const bucket = next[row.campaign_id as string];
          if (!bucket) continue;
          bucket.total++;
          if (row.status === 'active') bucket.active++;
          else if (row.status === 'failed') bucket.failed++;
          else if (row.status === 'completed') bucket.completed++;
          else if (row.status === 'cancelled') bucket.cancelled++;
        }
        setHealthById(next);
      }

      setLoadMs(Math.round(performance.now() - started));
      setLoading(false);
    }
    void load();
  }, []);

  const totals = useMemo(() => {
    return Object.values(healthById).reduce(
      (acc, h) => ({
        active: acc.active + h.active,
        failed: acc.failed + h.failed,
        completed: acc.completed + h.completed,
      }),
      { active: 0, failed: 0, completed: 0 },
    );
  }, [healthById]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drip campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-step WhatsApp nurture sequences — template 1, wait, template 2, and so on.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {campaigns.length} campaigns · {totals.active} active enrollments ·{' '}
            {totals.failed} failed · loaded in {loadMs ?? '—'}ms
          </p>
        </div>
        <GatedButton
          canAct={canCreate}
          gateReason="create drip campaigns"
          onClick={() => router.push('/drip-campaigns/new')}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New drip campaign
        </GatedButton>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-border bg-card">
          <Repeat className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No drip campaigns yet</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm text-center">
            Build a sequence of template messages with delays between each step — ideal for
            following up Lead Monitor contacts who only have a name and link.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {campaigns.map((c) => {
            const health = healthById[c.id];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => router.push(`/drip-campaigns/${c.id}`)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {audienceLabel(c.audience_filter as Record<string, unknown>)} ·{' '}
                    {health?.total ?? c.enrolled_count} enrolled ·{' '}
                    {health?.completed ?? c.completed_count} completed
                    {health?.failed ? ` · ${health.failed} failed` : ''}
                    {health?.active ? ` · ${health.active} active` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {health?.failed ? (
                    <span className="hidden sm:inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">
                      {health.failed} failed
                    </span>
                  ) : null}
                  {health?.active ? (
                    <span className="hidden sm:inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                      {health.active} live
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                      STATUS_STYLES[c.status] ?? STATUS_STYLES.draft
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
