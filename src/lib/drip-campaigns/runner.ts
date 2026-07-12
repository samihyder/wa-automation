import type { SupabaseClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/whatsapp/encryption';
import { sendTemplateMessage } from '@/lib/whatsapp/meta-api';
import {
  isRecipientNotAllowedError,
  isValidE164,
  phoneVariants,
  sanitizePhoneForMeta,
} from '@/lib/whatsapp/phone-utils';
import { isMessageTemplate } from '@/lib/whatsapp/template-row-guard';
import type { AudienceConfig, VariableMapping } from '@/lib/broadcasts/types';
import {
  fetchCustomValueIndex,
  resolveBroadcastAudience,
} from '@/lib/broadcasts/audience';
import { resolveVariables } from '@/lib/broadcasts/variables';
import type { Contact, MessageTemplate } from '@/types';

type DripStep = {
  id: string;
  step_order: number;
  template_name: string;
  template_language: string;
  template_variables: Record<string, VariableMapping>;
  header_media_url: string | null;
  delay_hours: number;
};

type Enrollment = {
  id: string;
  campaign_id: string;
  contact_id: string;
  account_id: string;
  current_step_index: number;
};

export async function enrollDripCampaign(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<{ enrolled: number; error?: string }> {
  const { data: campaign, error: campErr } = await supabase
    .from('drip_campaigns')
    .select('id, account_id, user_id, audience_filter, status')
    .eq('id', campaignId)
    .maybeSingle();

  if (campErr || !campaign) {
    return { enrolled: 0, error: campErr?.message ?? 'Campaign not found' };
  }

  const audience = (campaign.audience_filter ?? { type: 'all' }) as AudienceConfig;
  let contacts: Contact[];
  try {
    contacts = await resolveBroadcastAudience(
      supabase,
      campaign.account_id as string,
      campaign.user_id as string,
      audience,
    );
  } catch (err) {
    return { enrolled: 0, error: err instanceof Error ? err.message : 'Audience failed' };
  }

  if (contacts.length === 0) {
    return { enrolled: 0, error: 'No contacts match audience' };
  }

  const now = new Date().toISOString();
  const rows = contacts.map((c) => ({
    campaign_id: campaignId,
    contact_id: c.id,
    account_id: campaign.account_id,
    current_step_index: 0,
    next_run_at: now,
    status: 'active' as const,
  }));

  const CHUNK = 200;
  let enrolled = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('drip_enrollments')
      .upsert(chunk, { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true });
    if (error) return { enrolled, error: error.message };
    enrolled += chunk.length;
  }

  await supabase
    .from('drip_campaigns')
    .update({ status: 'active', enrolled_count: enrolled })
    .eq('id', campaignId);

  return { enrolled };
}

export async function processDueDripEnrollments(
  supabase: SupabaseClient,
  limit = 30,
): Promise<{ processed: number; errors: string[] }> {
  const now = new Date().toISOString();
  const { data: due, error } = await supabase
    .from('drip_enrollments')
    .select('id, campaign_id, contact_id, account_id, current_step_index')
    .eq('status', 'active')
    .lte('next_run_at', now)
    .order('next_run_at', { ascending: true })
    .limit(limit);

  if (error || !due?.length) {
    return { processed: 0, errors: error ? [error.message] : [] };
  }

  const errors: string[] = [];
  let processed = 0;

  for (const row of due as Enrollment[]) {
    const { data: claim } = await supabase
      .from('drip_enrollments')
      .update({ last_error: null })
      .eq('id', row.id)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();

    if (!claim) continue;

    const result = await sendDripStep(supabase, row);
    if (result.ok) processed++;
    else if (result.error) errors.push(result.error);
  }

  return { processed, errors };
}

async function sendDripStep(
  supabase: SupabaseClient,
  enrollment: Enrollment,
): Promise<{ ok: boolean; error?: string }> {
  const { data: campaign } = await supabase
    .from('drip_campaigns')
    .select('status')
    .eq('id', enrollment.campaign_id)
    .maybeSingle();

  if (campaign?.status === 'paused' || campaign?.status === 'draft') {
    return { ok: false };
  }

  const { data: steps } = await supabase
    .from('drip_campaign_steps')
    .select('*')
    .eq('campaign_id', enrollment.campaign_id)
    .order('step_order', { ascending: true });

  const stepList = (steps ?? []) as DripStep[];
  const step = stepList[enrollment.current_step_index];
  if (!step) {
    await supabase
      .from('drip_enrollments')
      .update({ status: 'completed' })
      .eq('id', enrollment.id);
    return { ok: true };
  }

  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', enrollment.contact_id)
    .maybeSingle();

  if (!contact?.phone) {
    await supabase
      .from('drip_enrollments')
      .update({ status: 'failed', last_error: 'Contact has no phone' })
      .eq('id', enrollment.id);
    return { ok: false, error: 'Contact has no phone' };
  }

  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', enrollment.account_id)
    .maybeSingle();

  if (!config) {
    await supabase
      .from('drip_enrollments')
      .update({ status: 'failed', last_error: 'WhatsApp not configured' })
      .eq('id', enrollment.id);
    return { ok: false, error: 'WhatsApp not configured' };
  }

  let accessToken: string;
  try {
    accessToken = decrypt(config.access_token);
  } catch {
    await supabase
      .from('drip_enrollments')
      .update({ status: 'failed', last_error: 'Token decrypt failed' })
      .eq('id', enrollment.id);
    return { ok: false, error: 'Token decrypt failed' };
  }

  const { data: rawTemplateRow } = await supabase
    .from('message_templates')
    .select('*')
    .eq('account_id', enrollment.account_id)
    .eq('name', step.template_name)
    .eq('language', step.template_language || 'en_US')
    .maybeSingle();

  const templateRow =
    rawTemplateRow && isMessageTemplate(rawTemplateRow)
      ? (rawTemplateRow as MessageTemplate)
      : null;

  const variables = step.template_variables ?? {};
  const customIndex = await fetchCustomValueIndex(supabase, [contact.id]);
  const params = resolveVariables(
    variables,
    contact as Contact,
    customIndex.get(contact.id),
  );

  const headerType = templateRow?.header_type;
  const isMediaHeader =
    headerType === 'image' || headerType === 'video' || headerType === 'document';
  const headerUrl = step.header_media_url?.trim();
  const messageParams =
    isMediaHeader && headerUrl ? { headerMediaUrl: headerUrl } : undefined;

  const sanitized = sanitizePhoneForMeta(contact.phone);
  if (!isValidE164(sanitized)) {
    await supabase
      .from('drip_enrollments')
      .update({ status: 'failed', last_error: 'Invalid phone' })
      .eq('id', enrollment.id);
    return { ok: false, error: 'Invalid phone' };
  }

  let sent = false;
  let lastError = 'Send failed';
  for (const variant of phoneVariants(sanitized)) {
    try {
      await sendTemplateMessage({
        phoneNumberId: config.phone_number_id,
        accessToken,
        to: variant,
        templateName: step.template_name,
        language: step.template_language || 'en_US',
        template: templateRow ?? undefined,
        messageParams,
        params,
      });
      sent = true;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (!isRecipientNotAllowedError(msg)) {
        lastError = msg;
        break;
      }
      lastError = msg;
    }
  }

  if (!sent) {
    await supabase
      .from('drip_enrollments')
      .update({ status: 'failed', last_error: lastError })
      .eq('id', enrollment.id);
    return { ok: false, error: lastError };
  }

  const nextIndex = enrollment.current_step_index + 1;
  const nextStep = stepList[nextIndex];

  if (!nextStep) {
    await supabase
      .from('drip_enrollments')
      .update({
        status: 'completed',
        current_step_index: nextIndex,
        last_sent_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id);

    const { data: camp } = await supabase
      .from('drip_campaigns')
      .select('completed_count')
      .eq('id', enrollment.campaign_id)
      .maybeSingle();
    await supabase
      .from('drip_campaigns')
      .update({
        completed_count: ((camp?.completed_count as number) ?? 0) + 1,
      })
      .eq('id', enrollment.campaign_id);

    return { ok: true };
  }

  const nextRun = new Date();
  nextRun.setHours(nextRun.getHours() + Math.max(0, nextStep.delay_hours));

  await supabase
    .from('drip_enrollments')
    .update({
      current_step_index: nextIndex,
      next_run_at: nextRun.toISOString(),
      last_sent_at: new Date().toISOString(),
    })
    .eq('id', enrollment.id);

  return { ok: true };
}
