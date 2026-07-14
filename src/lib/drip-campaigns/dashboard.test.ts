import { describe, expect, it } from 'vitest';
import {
  assembleDashboard,
  buildEnrollmentCounts,
  buildStepFunnel,
  evaluateTemplateReadiness,
} from './dashboard';
import type { DripCampaign, DripCampaignStep } from '@/types';

const campaign = {
  id: 'c1',
  account_id: 'a1',
  user_id: 'u1',
  name: 'CTDISR',
  audience_filter: { type: 'tags', tagIds: ['t1', 't2'] },
  status: 'active',
  enrolled_count: 10,
  completed_count: 3,
  created_at: '2026-07-14T00:00:00Z',
  updated_at: '2026-07-14T00:00:00Z',
} as DripCampaign;

const steps = [
  {
    id: 's0',
    campaign_id: 'c1',
    step_order: 0,
    name: 'Intro',
    template_name: 't1',
    template_language: 'en_US',
    delay_hours: 0,
    created_at: '2026-07-14T00:00:00Z',
  },
  {
    id: 's1',
    campaign_id: 'c1',
    step_order: 1,
    name: 'Follow',
    template_name: 't2',
    template_language: 'en',
    delay_hours: 24,
    created_at: '2026-07-14T00:00:00Z',
  },
] as DripCampaignStep[];

describe('drip dashboard helpers', () => {
  it('counts enrollment statuses', () => {
    expect(
      buildEnrollmentCounts([
        { status: 'active' },
        { status: 'active' },
        { status: 'completed' },
        { status: 'failed' },
        { status: 'cancelled' },
      ]),
    ).toEqual({
      active: 2,
      completed: 1,
      failed: 1,
      cancelled: 1,
      total: 5,
    });
  });

  it('builds step funnel', () => {
    const ready = new Map([
      ['t1::en_US', { ready: true }],
      ['t2::en', { ready: false, warning: 'Media header has no public URL' }],
    ]);
    const funnel = buildStepFunnel({
      steps,
      enrollments: [
        { status: 'active', current_step_index: 0 },
        { status: 'active', current_step_index: 1 },
        { status: 'completed', current_step_index: 2 },
        { status: 'failed', current_step_index: 0 },
      ],
      templateReadyByKey: ready,
    });
    expect(funnel[0].onStep).toBe(1);
    // Active@0, active@1, completed@2, failed@0 — all four have reached step 0.
    expect(funnel[0].reachedOrPast).toBe(4);
    expect(funnel[1].templateReady).toBe(false);
  });

  it('flags ephemeral header URLs', () => {
    expect(
      evaluateTemplateReadiness({
        status: 'APPROVED',
        header_type: 'image',
        header_media_url: 'https://scontent.whatsapp.net/v/x.png',
      }).ready,
    ).toBe(false);
    expect(
      evaluateTemplateReadiness({
        status: 'APPROVED',
        header_type: 'image',
        header_media_url: 'https://cdn.example.com/x.png',
      }).ready,
    ).toBe(true);
  });

  it('assembles dashboard rates and due counts', () => {
    const ready = new Map([
      ['t1::en_US', { ready: true }],
      ['t2::en', { ready: true }],
    ]);
    const dash = assembleDashboard({
      campaign,
      steps,
      enrollmentStatuses: [
        {
          status: 'active',
          current_step_index: 0,
          next_run_at: '2026-07-14T09:00:00Z',
          enrolled_at: '2026-07-14T08:00:00Z',
          last_sent_at: null,
        },
        {
          status: 'completed',
          current_step_index: 2,
          next_run_at: '2026-07-14T10:00:00Z',
          enrolled_at: '2026-07-14T07:00:00Z',
          last_sent_at: '2026-07-14T09:30:00Z',
        },
        {
          status: 'failed',
          current_step_index: 0,
          next_run_at: '2026-07-14T08:30:00Z',
          enrolled_at: '2026-07-14T08:10:00Z',
          last_sent_at: null,
        },
      ],
      failures: [],
      templateReadyByKey: ready,
      now: new Date('2026-07-14T09:30:00Z'),
    });
    expect(dash.dueNow).toBe(1);
    expect(dash.completionRate).toBe(33);
    expect(dash.audience.summary).toContain('Tags');
    expect(dash.sequenceHours).toBe(24);
  });
});
