import type { AudienceConfig } from '@/lib/broadcasts/types';
import type { DripCampaign, DripCampaignStep, DripEnrollment } from '@/types';
import {
  headerMediaNeedsRehost,
  resolveTemplateHeaderMediaUrl,
} from '@/lib/whatsapp/template-header-media';

export type EnrollmentStatusCounts = {
  active: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
};

export type StepFunnelRow = {
  stepId: string;
  stepOrder: number;
  name: string | null;
  templateName: string;
  templateLanguage: string;
  delayHours: number;
  /** Contacts currently waiting on this step (active, index matches). */
  onStep: number;
  /** Contacts who have moved past this step (or completed). */
  reachedOrPast: number;
  templateReady: boolean;
  templateWarning?: string;
};

export type FailureRow = {
  enrollmentId: string;
  contactId: string;
  contactName: string;
  phone: string;
  stepIndex: number;
  lastError: string | null;
  lastSentAt: string | null;
  enrolledAt: string;
};

export type DripCampaignDashboard = {
  campaign: DripCampaign;
  steps: DripCampaignStep[];
  counts: EnrollmentStatusCounts;
  dueNow: number;
  nextRunAt: string | null;
  earliestEnrolledAt: string | null;
  latestSentAt: string | null;
  completionRate: number;
  failureRate: number;
  dropOffRate: number;
  sequenceHours: number;
  audience: {
    filter: AudienceConfig | Record<string, unknown>;
    summary: string;
  };
  stepFunnel: StepFunnelRow[];
  failures: FailureRow[];
  templateWarnings: string[];
};

function audienceSummary(filter: Record<string, unknown> | null | undefined): string {
  if (!filter || typeof filter !== 'object') return 'All contacts';
  const type = typeof filter.type === 'string' ? filter.type : 'all';
  if (type === 'all') return 'All contacts';
  if (type === 'tags') {
    const ids = Array.isArray(filter.tagIds) ? filter.tagIds : [];
    const exclude = Array.isArray(filter.excludeTagIds) ? filter.excludeTagIds : [];
    const parts = [`Tags (${ids.length} selected)`];
    if (exclude.length) parts.push(`exclude ${exclude.length}`);
    return parts.join(' · ');
  }
  if (type === 'custom_field') {
    const cf = filter.customField as { operator?: string; value?: string } | undefined;
    return `Custom field ${cf?.operator ?? ''} ${cf?.value ?? ''}`.trim();
  }
  if (type === 'csv') {
    const rows = Array.isArray(filter.csvContacts) ? filter.csvContacts.length : 0;
    return `CSV import (${rows} rows)`;
  }
  return type;
}

export function buildEnrollmentCounts(
  rows: Array<{ status: string }>,
): EnrollmentStatusCounts {
  const counts: EnrollmentStatusCounts = {
    active: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    total: rows.length,
  };
  for (const row of rows) {
    if (row.status === 'active') counts.active++;
    else if (row.status === 'completed') counts.completed++;
    else if (row.status === 'failed') counts.failed++;
    else if (row.status === 'cancelled') counts.cancelled++;
  }
  return counts;
}

export function buildStepFunnel(params: {
  steps: DripCampaignStep[];
  enrollments: Array<{ status: string; current_step_index: number }>;
  templateReadyByKey: Map<string, { ready: boolean; warning?: string }>;
}): StepFunnelRow[] {
  const { steps, enrollments, templateReadyByKey } = params;
  return steps.map((step, index) => {
    let onStep = 0;
    let reachedOrPast = 0;
    for (const e of enrollments) {
      if (e.status === 'active' && e.current_step_index === index) onStep++;
      if (
        e.status === 'completed' ||
        e.current_step_index > index ||
        (e.status === 'failed' && e.current_step_index >= index)
      ) {
        reachedOrPast++;
      }
    }
    const key = `${step.template_name}::${step.template_language}`;
    const readiness = templateReadyByKey.get(key) ?? {
      ready: false,
      warning: 'Template not found locally',
    };
    return {
      stepId: step.id,
      stepOrder: step.step_order,
      name: step.name ?? null,
      templateName: step.template_name,
      templateLanguage: step.template_language,
      delayHours: step.delay_hours,
      onStep,
      reachedOrPast,
      templateReady: readiness.ready,
      templateWarning: readiness.warning,
    };
  });
}

export function evaluateTemplateReadiness(template: {
  status?: string | null;
  header_type?: string | null;
  header_media_url?: string | null;
  header_handle?: string | null;
} | null): { ready: boolean; warning?: string } {
  if (!template) return { ready: false, warning: 'Template not found locally' };
  if ((template.status ?? '').toUpperCase() !== 'APPROVED') {
    return { ready: false, warning: `Template status is ${template.status ?? 'unknown'}` };
  }
  const mediaType = template.header_type;
  if (mediaType === 'image' || mediaType === 'video' || mediaType === 'document') {
    const url = resolveTemplateHeaderMediaUrl(template);
    if (!url) {
      return { ready: false, warning: 'Media header has no public URL' };
    }
    if (headerMediaNeedsRehost(url)) {
      return { ready: false, warning: 'Header still uses temporary Meta CDN URL' };
    }
  }
  return { ready: true };
}

export function assembleDashboard(params: {
  campaign: DripCampaign;
  steps: DripCampaignStep[];
  enrollmentStatuses: Array<{
    status: string;
    current_step_index: number;
    next_run_at: string | null;
    enrolled_at: string | null;
    last_sent_at: string | null;
  }>;
  failures: FailureRow[];
  templateReadyByKey: Map<string, { ready: boolean; warning?: string }>;
  now?: Date;
}): DripCampaignDashboard {
  const now = params.now ?? new Date();
  const counts = buildEnrollmentCounts(params.enrollmentStatuses);
  const stepFunnel = buildStepFunnel({
    steps: params.steps,
    enrollments: params.enrollmentStatuses,
    templateReadyByKey: params.templateReadyByKey,
  });

  let dueNow = 0;
  let nextRunAt: string | null = null;
  let earliestEnrolledAt: string | null = null;
  let latestSentAt: string | null = null;

  for (const row of params.enrollmentStatuses) {
    if (row.status === 'active' && row.next_run_at) {
      const t = new Date(row.next_run_at).getTime();
      if (t <= now.getTime()) dueNow++;
      if (!nextRunAt || t < new Date(nextRunAt).getTime()) {
        if (t > now.getTime()) nextRunAt = row.next_run_at;
      }
    }
    if (row.enrolled_at) {
      if (
        !earliestEnrolledAt ||
        new Date(row.enrolled_at).getTime() < new Date(earliestEnrolledAt).getTime()
      ) {
        earliestEnrolledAt = row.enrolled_at;
      }
    }
    if (row.last_sent_at) {
      if (
        !latestSentAt ||
        new Date(row.last_sent_at).getTime() > new Date(latestSentAt).getTime()
      ) {
        latestSentAt = row.last_sent_at;
      }
    }
  }

  // If dueNow > 0 and no future next, earliest due is "now"
  if (dueNow > 0 && !nextRunAt) {
    const dueTimes = params.enrollmentStatuses
      .filter((r) => r.status === 'active' && r.next_run_at)
      .map((r) => r.next_run_at!)
      .sort();
    nextRunAt = dueTimes[0] ?? null;
  }

  const sequenceHours = params.steps.reduce(
    (sum, step, i) => sum + (i === 0 ? 0 : Math.max(0, step.delay_hours ?? 0)),
    0,
  );

  const completionRate =
    counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
  const failureRate =
    counts.total > 0 ? Math.round((counts.failed / counts.total) * 100) : 0;
  const startedOrDone = counts.completed + counts.failed + counts.cancelled + counts.active;
  const dropOffRate =
    startedOrDone > 0
      ? Math.round(((counts.failed + counts.cancelled) / startedOrDone) * 100)
      : 0;

  const templateWarnings = [
    ...new Set(
      stepFunnel
        .filter((s) => !s.templateReady)
        .map((s) => `${s.templateName}: ${s.templateWarning ?? 'not ready'}`),
    ),
  ];

  return {
    campaign: params.campaign,
    steps: params.steps,
    counts,
    dueNow,
    nextRunAt,
    earliestEnrolledAt,
    latestSentAt,
    completionRate,
    failureRate,
    dropOffRate,
    sequenceHours,
    audience: {
      filter: (params.campaign.audience_filter ?? { type: 'all' }) as unknown as AudienceConfig,
      summary: audienceSummary(params.campaign.audience_filter as Record<string, unknown>),
    },
    stepFunnel,
    failures: params.failures,
    templateWarnings,
  };
}

export type { DripEnrollment };
