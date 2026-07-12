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

const SEND_BATCH_SIZE = 10;
const SEND_BATCH_DELAY_MS = 1000;
const INSERT_BATCH_SIZE = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type BroadcastRow = {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  template_name: string;
  template_language: string;
  template_variables: Record<string, VariableMapping> | null;
  audience_filter: AudienceConfig | null;
  status: string;
};

function parseAudienceFilter(raw: unknown): AudienceConfig {
  if (!raw || typeof raw !== 'object') return { type: 'all' };
  return raw as AudienceConfig;
}

/**
 * Execute a broadcast send server-side (scheduled cron or manual trigger).
 * Expects broadcast row to be in `scheduled` or re-entrant `sending`.
 */
export async function executeBroadcastSend(
  supabase: SupabaseClient,
  broadcastId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: rawBroadcast, error: loadErr } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('id', broadcastId)
    .maybeSingle();

  if (loadErr || !rawBroadcast) {
    return { ok: false, error: loadErr?.message ?? 'Broadcast not found' };
  }

  const broadcast = rawBroadcast as BroadcastRow;

  if (!['scheduled', 'sending'].includes(broadcast.status)) {
    return { ok: false, error: `Broadcast status is ${broadcast.status}, cannot send` };
  }

  const { data: claimed } = await supabase
    .from('broadcasts')
    .update({ status: 'sending' })
    .eq('id', broadcastId)
    .in('status', ['scheduled', 'sending'])
    .select('id')
    .maybeSingle();

  if (!claimed) {
    return { ok: false, error: 'Broadcast already claimed by another worker' };
  }

  const audience = parseAudienceFilter(broadcast.audience_filter);
  const variables = (broadcast.template_variables ?? {}) as Record<string, VariableMapping>;
  const headerMediaUrl = audience.headerMediaUrl?.trim();

  let contacts: Contact[];
  try {
    contacts = await resolveBroadcastAudience(
      supabase,
      broadcast.account_id,
      broadcast.user_id,
      audience,
    );
  } catch (err) {
    await supabase.from('broadcasts').update({ status: 'failed' }).eq('id', broadcastId);
    return { ok: false, error: err instanceof Error ? err.message : 'Audience resolution failed' };
  }

  if (contacts.length === 0) {
    await supabase
      .from('broadcasts')
      .update({ status: 'failed', total_recipients: 0 })
      .eq('id', broadcastId);
    return { ok: false, error: 'No contacts in audience' };
  }

  await supabase
    .from('broadcasts')
    .update({ total_recipients: contacts.length })
    .eq('id', broadcastId);

  const recipientRows = contacts.map((contact) => ({
    broadcast_id: broadcastId,
    contact_id: contact.id,
    status: 'pending' as const,
  }));

  for (let i = 0; i < recipientRows.length; i += INSERT_BATCH_SIZE) {
    const batch = recipientRows.slice(i, i + INSERT_BATCH_SIZE);
    const { error: recipientError } = await supabase.from('broadcast_recipients').insert(batch);
    if (recipientError) {
      await supabase.from('broadcasts').update({ status: 'failed' }).eq('id', broadcastId);
      return { ok: false, error: recipientError.message };
    }
  }

  const { data: config, error: configError } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', broadcast.account_id)
    .single();

  if (configError || !config) {
    await supabase.from('broadcasts').update({ status: 'failed' }).eq('id', broadcastId);
    return { ok: false, error: 'WhatsApp not configured for this account' };
  }

  let accessToken: string;
  try {
    accessToken = decrypt(config.access_token);
  } catch {
    await supabase.from('broadcasts').update({ status: 'failed' }).eq('id', broadcastId);
    return { ok: false, error: 'Cannot decrypt WhatsApp access token' };
  }

  const { data: rawTemplateRow } = await supabase
    .from('message_templates')
    .select('*')
    .eq('account_id', broadcast.account_id)
    .eq('name', broadcast.template_name)
    .eq('language', broadcast.template_language || 'en_US')
    .maybeSingle();

  if (rawTemplateRow && !isMessageTemplate(rawTemplateRow)) {
    await supabase.from('broadcasts').update({ status: 'failed' }).eq('id', broadcastId);
    return { ok: false, error: 'Template row malformed — sync from Meta' };
  }

  const templateRow = (rawTemplateRow as MessageTemplate | null) ?? null;
  const headerType = templateRow?.header_type;
  const isMediaHeader =
    headerType === 'image' || headerType === 'video' || headerType === 'document';
  const messageParams =
    isMediaHeader && headerMediaUrl ? { headerMediaUrl } : undefined;

  const { data: recipients, error: recipientsFetchError } = await supabase
    .from('broadcast_recipients')
    .select('*, contact:contacts(*)')
    .eq('broadcast_id', broadcastId);

  if (recipientsFetchError || !recipients) {
    await supabase.from('broadcasts').update({ status: 'failed' }).eq('id', broadcastId);
    return { ok: false, error: 'Failed to load recipients' };
  }

  const contactIds = recipients
    .map((r) => (r.contact as Contact | null)?.id)
    .filter((id): id is string => Boolean(id));
  const customValueIndex = await fetchCustomValueIndex(supabase, contactIds);

  let failedCount = 0;
  const totalRecipients = recipients.length;

  for (let i = 0; i < recipients.length; i += SEND_BATCH_SIZE) {
    const batch = recipients.slice(i, i + SEND_BATCH_SIZE);

    for (const recipient of batch) {
      const contact = recipient.contact as Contact | null;
      const phone = contact?.phone;
      if (!phone) {
        failedCount++;
        await supabase
          .from('broadcast_recipients')
          .update({ status: 'failed', error_message: 'No phone number on contact' })
          .eq('id', recipient.id);
        continue;
      }

      const sanitized = sanitizePhoneForMeta(phone);
      if (!isValidE164(sanitized)) {
        failedCount++;
        await supabase
          .from('broadcast_recipients')
          .update({ status: 'failed', error_message: 'Invalid phone number format' })
          .eq('id', recipient.id);
        continue;
      }

      const params = contact
        ? resolveVariables(variables, contact, customValueIndex.get(contact.id))
        : [];

      const variants = phoneVariants(sanitized);
      let sentMessageId: string | null = null;
      let lastError: string | null = null;

      for (const variant of variants) {
        try {
          const result = await sendTemplateMessage({
            phoneNumberId: config.phone_number_id,
            accessToken,
            to: variant,
            templateName: broadcast.template_name,
            language: broadcast.template_language || 'en_US',
            template: templateRow ?? undefined,
            messageParams,
            params,
          });
          sentMessageId = result.messageId;
          lastError = null;
          break;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (!isRecipientNotAllowedError(errorMessage)) {
            lastError = errorMessage;
            break;
          }
          lastError = errorMessage;
        }
      }

      if (sentMessageId) {
        await supabase
          .from('broadcast_recipients')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            whatsapp_message_id: sentMessageId,
            error_message: null,
          })
          .eq('id', recipient.id);
      } else {
        failedCount++;
        await supabase
          .from('broadcast_recipients')
          .update({
            status: 'failed',
            error_message: lastError ?? 'Unknown error',
          })
          .eq('id', recipient.id);
      }
    }

    if (i + SEND_BATCH_SIZE < totalRecipients) {
      await sleep(SEND_BATCH_DELAY_MS);
    }
  }

  const finalStatus = failedCount === totalRecipients ? 'failed' : 'sent';
  await supabase.from('broadcasts').update({ status: finalStatus }).eq('id', broadcastId);

  return { ok: finalStatus === 'sent' };
}
