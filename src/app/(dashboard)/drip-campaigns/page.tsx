'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { DripCampaign } from '@/types';
import { Button } from '@/components/ui/button';
import { GatedButton } from '@/components/ui/gated-button';
import { useCan } from '@/hooks/use-can';
import { Loader2, Plus, Repeat } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/10 text-muted-foreground border-slate-500/20',
  active: 'bg-primary/10 text-primary border-primary/20',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function DripCampaignsPage() {
  const router = useRouter();
  const canCreate = useCan('send-messages');
  const [campaigns, setCampaigns] = useState<DripCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('drip_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      setCampaigns((data ?? []) as DripCampaign[]);
      setLoading(false);
    }
    void load();
  }, []);

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
          {campaigns.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => router.push(`/drip-campaigns/${c.id}`)}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.enrolled_count} enrolled · {c.completed_count} completed
                </p>
              </div>
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                  STATUS_STYLES[c.status] ?? STATUS_STYLES.draft
                }`}
              >
                {c.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
