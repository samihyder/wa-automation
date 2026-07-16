'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchApi } from '@/lib/fetch-api';
import type { DripCampaignDashboard } from '@/lib/drip-campaigns/dashboard';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Pause,
  Play,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/10 text-muted-foreground border-slate-500/20',
  active: 'bg-primary/10 text-primary border-primary/20',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  archived: 'bg-muted/50 text-muted-foreground border-border',
};

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  tone?: 'default' | 'ok' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'ok'
      ? 'bg-emerald-500/10 text-emerald-400'
      : tone === 'warn'
        ? 'bg-yellow-500/10 text-yellow-400'
        : tone === 'danger'
          ? 'bg-red-500/10 text-red-400'
          : 'bg-muted text-muted-foreground';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
          {icon}
        </div>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function toCsv(rows: string[][]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(escape).join(',')).join('\n');
}

function downloadBlob(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DripCampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [dash, setDash] = useState<DripCampaignDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loadMs, setLoadMs] = useState<number | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      const soft = opts?.soft === true;
      if (soft) setRefreshing(true);
      else setLoading(true);
      const started = performance.now();
      try {
        const res = await fetchApi(`/api/drip-campaigns/${campaignId}/stats`, {
          cache: 'no-store',
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Failed to load dashboard');
        setDash(body as DripCampaignDashboard);
        setLoadMs(Math.round(performance.now() - started));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Soft poll while active — 30s keeps cron (5m) visibility without hammering.
  useEffect(() => {
    if (dash?.campaign.status !== 'active') return;
    const id = window.setInterval(() => {
      void load({ soft: true });
    }, 30_000);
    return () => window.clearInterval(id);
  }, [dash?.campaign.status, load]);

  async function handleActivate() {
    setActivating(true);
    try {
      const res = await fetchApi(`/api/drip-campaigns/${campaignId}/activate`, {
        method: 'POST',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Activation failed');
      toast.success(`Enrolled ${body.enrolled ?? 0} contacts`);
      await load({ soft: true });
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
    await load({ soft: true });
  }

  async function handleArchive() {
    const supabase = createClient();
    // Stop first: cancel any still-active enrollments so nothing sends further.
    await supabase
      .from('drip_enrollments')
      .update({
        status: 'cancelled',
        last_error: 'Campaign archived — remaining steps stopped',
      })
      .eq('campaign_id', campaignId)
      .eq('status', 'active');
    const { error } = await supabase
      .from('drip_campaigns')
      .update({ status: 'archived' })
      .eq('id', campaignId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Campaign archived');
    await load({ soft: true });
  }

  async function handleUnarchive() {
    const supabase = createClient();
    const { error } = await supabase
      .from('drip_campaigns')
      .update({ status: 'paused' })
      .eq('id', campaignId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Campaign restored (paused)');
    await load({ soft: true });
  }

  async function handleProcessDue() {
    setProcessing(true);
    try {
      const res = await fetchApi(`/api/drip-campaigns/${campaignId}/process`, {
        method: 'POST',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Process failed');
      const errN = body.errorCount ?? 0;
      toast.success(
        `Processed ${body.processed ?? 0} due recipients` +
          (errN ? ` (${errN} errors)` : ''),
      );
      if (Array.isArray(body.errors) && body.errors.length) {
        toast.message(String(body.errors[0]));
      }
      await load({ soft: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process due');
    } finally {
      setProcessing(false);
    }
  }

  const funnelMax = useMemo(() => {
    if (!dash) return 1;
    return Math.max(...dash.stepFunnel.map((s) => s.reachedOrPast), dash.counts.total, 1);
  }, [dash]);

  function exportFailures() {
    if (!dash?.failures.length) {
      toast.error('No failures to export');
      return;
    }
    const rows = [
      ['contact', 'phone', 'step', 'error', 'enrolled_at', 'last_sent_at'],
      ...dash.failures.map((f) => [
        f.contactName,
        f.phone,
        String(f.stepIndex + 1),
        f.lastError ?? '',
        f.enrolledAt,
        f.lastSentAt ?? '',
      ]),
    ];
    downloadBlob(`${dash.campaign.name}-failures.csv`, toCsv(rows));
  }

  if (loading && !dash) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!dash) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">Campaign not found</p>
        <Button variant="outline" onClick={() => router.push('/drip-campaigns')}>
          Back
        </Button>
      </div>
    );
  }

  const { campaign, counts } = dash;

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
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                  STATUS_STYLES[campaign.status] ?? STATUS_STYLES.draft
                }`}
              >
                {campaign.status}
              </span>
              {refreshing ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {dash.audience.summary}
              {campaign.description ? ` · ${campaign.description}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sequence ~{dash.sequenceHours}h · Loaded in {loadMs ?? '—'}ms
              {dash.campaign.status === 'active' ? ' · Auto-refresh 30s' : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {campaign.status === 'draft' && (
            <Button
              disabled={activating || dash.templateWarnings.length > 0}
              onClick={() => void handleActivate()}
              className="bg-primary text-primary-foreground"
              title={
                dash.templateWarnings.length
                  ? 'Fix template warnings before starting'
                  : undefined
              }
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
          {(campaign.status === 'active' || campaign.status === 'paused') && dash.dueNow > 0 && (
            <Button
              variant="outline"
              disabled={processing}
              onClick={() => void handleProcessDue()}
              title="Send the next due step for up to 50 waiting recipients now"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Process due ({dash.dueNow})
            </Button>
          )}
          {campaign.status === 'paused' && (
            <Button onClick={() => void handlePauseResume('active')}>
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}
          {campaign.status !== 'draft' && campaign.status !== 'archived' && (
            <Button
              variant="outline"
              onClick={() => void handleArchive()}
              title="Stop sending and move this campaign to the archive"
            >
              <Archive className="h-4 w-4" />
              Archive
            </Button>
          )}
          {campaign.status === 'archived' && (
            <Button variant="outline" onClick={() => void handleUnarchive()}>
              <ArchiveRestore className="h-4 w-4" />
              Unarchive
            </Button>
          )}
          <Button variant="outline" onClick={() => void load({ soft: true })}>
            Refresh
          </Button>
        </div>
      </div>

      {dash.templateWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p className="font-medium">Template readiness</p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {dash.templateWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard
          label="Enrolled"
          value={counts.total}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Active"
          value={counts.active}
          hint={`${pct(counts.active, counts.total)}%`}
          icon={<Play className="h-4 w-4" />}
          tone="ok"
        />
        <StatCard
          label="Completed"
          value={counts.completed}
          hint={`${dash.completionRate}%`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="ok"
        />
        <StatCard
          label="Failed"
          value={counts.failed}
          hint={`${dash.failureRate}%`}
          icon={<XCircle className="h-4 w-4" />}
          tone={counts.failed ? 'danger' : 'default'}
        />
        <StatCard
          label="Cancelled"
          value={counts.cancelled}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={counts.cancelled ? 'warn' : 'default'}
        />
        <StatCard
          label="Due now"
          value={dash.dueNow}
          icon={<Clock className="h-4 w-4" />}
          tone={dash.dueNow ? 'warn' : 'default'}
        />
        <StatCard
          label="Drop-off"
          value={`${dash.dropOffRate}%`}
          hint="failed + cancelled"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Steps"
          value={dash.steps.length}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Timeline</h3>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd className="text-foreground">{formatWhen(campaign.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Updated</dt>
              <dd className="text-foreground">{formatWhen(campaign.updated_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">First enrolled</dt>
              <dd className="text-foreground">{formatWhen(dash.earliestEnrolledAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last sent</dt>
              <dd className="text-foreground">{formatWhen(dash.latestSentAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Next / due run</dt>
              <dd className="text-foreground">{formatWhen(dash.nextRunAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Audience</dt>
              <dd className="text-foreground">{dash.audience.summary}</dd>
            </div>
          </dl>
          {campaign.status === 'active' && (
            <p className="mt-3 text-xs text-muted-foreground">
              Cron should process due enrollments about every 5 minutes. If Due now stays high,
              use <span className="text-foreground">Process due</span> or check that{' '}
              <code className="text-[11px]">CRON_SECRET</code> matches{' '}
              <code className="text-[11px]">AUTOMATION_CRON_SECRET</code> on Vercel.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Step funnel</h3>
          <div className="space-y-2">
            {dash.stepFunnel.map((step, i) => {
              const width = Math.max(8, Math.round((step.reachedOrPast / funnelMax) * 100));
              return (
                <div key={step.stepId} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-foreground">
                      Step {i + 1}
                      {step.name ? `: ${step.name}` : ''}
                    </span>
                    <span className="text-muted-foreground">
                      {step.onStep} waiting · {step.reachedOrPast} reached
                    </span>
                  </div>
                  <div className="h-7 rounded-full bg-muted">
                    <div
                      className="flex h-7 items-center rounded-full bg-primary/70 px-3 text-[11px] font-medium text-primary-foreground transition-[width] duration-300"
                      style={{ width: `${width}%` }}
                    >
                      {step.templateName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Sequence</p>
          <p className="text-xs text-muted-foreground">~{dash.sequenceHours} hours total delay</p>
        </div>
        {dash.stepFunnel.map((step, i) => (
          <div
            key={step.stepId}
            className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Step {i + 1}
                {step.name ? `: ${step.name}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {step.templateName} ({step.templateLanguage})
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {step.onStep} on this step · {step.reachedOrPast} reached/past
              </p>
              {!step.templateReady && (
                <p className="mt-1 text-xs text-amber-300">{step.templateWarning}</p>
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{i === 0 ? 'On enroll' : `+${step.delayHours}h after previous`}</p>
              <p className={step.templateReady ? 'text-emerald-400' : 'text-amber-300'}>
                {step.templateReady ? 'Template ready' : 'Needs attention'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Failures</p>
            <p className="text-xs text-muted-foreground">
              Latest {dash.failures.length} failed enrollments (capped at 50)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!dash.failures.length}
            onClick={exportFailures}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
        {dash.failures.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No failures yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.failures.map((f) => (
                  <TableRow key={f.enrollmentId}>
                    <TableCell className="font-medium">{f.contactName}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {f.phone || '—'}
                    </TableCell>
                    <TableCell>{f.stepIndex + 1}</TableCell>
                    <TableCell className="max-w-md truncate text-red-300" title={f.lastError ?? ''}>
                      {f.lastError || 'Unknown error'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatWhen(f.enrolledAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
