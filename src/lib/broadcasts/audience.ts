import type { SupabaseClient } from '@supabase/supabase-js';
import type { Contact } from '@/types';
import type { AudienceConfig, CustomFieldFilter } from '@/lib/broadcasts/types';

export async function resolveBroadcastAudience(
  supabase: SupabaseClient,
  accountId: string,
  userId: string,
  audience: AudienceConfig,
): Promise<Contact[]> {
  let contacts: Contact[] = [];

  if (audience.type === 'all') {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('account_id', accountId);
    if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
    contacts = (data ?? []) as Contact[];
  } else if (audience.type === 'tags' && audience.tagIds && audience.tagIds.length > 0) {
    const { data: contactTags, error: tagError } = await supabase
      .from('contact_tags')
      .select('contact_id')
      .in('tag_id', audience.tagIds);

    if (tagError) throw new Error(`Failed to fetch contact tags: ${tagError.message}`);

    const uniqueContactIds = [...new Set((contactTags ?? []).map((ct) => ct.contact_id))];
    if (uniqueContactIds.length > 0) {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('account_id', accountId)
        .in('id', uniqueContactIds);
      if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
      contacts = (data ?? []) as Contact[];
    }
  } else if (audience.type === 'custom_field' && audience.customField) {
    contacts = await resolveCustomFieldAudience(supabase, accountId, audience.customField);
  } else if (audience.type === 'csv' && audience.csvContacts) {
    contacts = await upsertCsvContacts(supabase, accountId, userId, audience.csvContacts);
  }

  if (audience.excludeTagIds && audience.excludeTagIds.length > 0) {
    const { data: excludeRows } = await supabase
      .from('contact_tags')
      .select('contact_id')
      .in('tag_id', audience.excludeTagIds);
    const excludedIds = new Set((excludeRows ?? []).map((r) => r.contact_id));
    contacts = contacts.filter((c) => !excludedIds.has(c.id));
  }

  return contacts;
}

async function resolveCustomFieldAudience(
  supabase: SupabaseClient,
  accountId: string,
  filter: CustomFieldFilter,
): Promise<Contact[]> {
  const { fieldId, operator, value } = filter;

  let query = supabase
    .from('contact_custom_values')
    .select('contact_id')
    .eq('custom_field_id', fieldId);

  if (operator === 'is') query = query.eq('value', value);
  else if (operator === 'is_not') query = query.neq('value', value);
  else if (operator === 'contains') query = query.ilike('value', `%${value}%`);

  const { data: matches, error: matchErr } = await query;
  if (matchErr) throw new Error(`Custom-field filter failed: ${matchErr.message}`);

  const contactIds = [...new Set((matches ?? []).map((m) => m.contact_id))];
  if (contactIds.length === 0) return [];

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('account_id', accountId)
    .in('id', contactIds);
  if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
  return (data ?? []) as Contact[];
}

async function upsertCsvContacts(
  supabase: SupabaseClient,
  accountId: string,
  userId: string,
  csvRows: { phone: string; name?: string }[],
): Promise<Contact[]> {
  if (csvRows.length === 0) return [];

  const uniqueByPhone = new Map<string, { phone: string; name?: string }>();
  for (const row of csvRows) {
    if (row.phone) uniqueByPhone.set(row.phone, row);
  }
  const phones = [...uniqueByPhone.keys()];

  const { data: existing, error: lookupErr } = await supabase
    .from('contacts')
    .select('*')
    .eq('account_id', accountId)
    .in('phone', phones);
  if (lookupErr) throw new Error(`Failed to look up CSV contacts: ${lookupErr.message}`);

  const byPhone = new Map<string, Contact>();
  for (const c of (existing ?? []) as Contact[]) {
    if (c.phone) byPhone.set(c.phone, c);
  }

  const missing = phones
    .filter((p) => !byPhone.has(p))
    .map((phone) => ({
      user_id: userId,
      account_id: accountId,
      phone,
      name: uniqueByPhone.get(phone)?.name ?? null,
    }));

  const INSERT_CHUNK = 200;
  for (let i = 0; i < missing.length; i += INSERT_CHUNK) {
    const chunk = missing.slice(i, i + INSERT_CHUNK);
    const { data: inserted, error: insertErr } = await supabase
      .from('contacts')
      .insert(chunk)
      .select();
    if (insertErr) throw new Error(`Failed to create CSV contacts: ${insertErr.message}`);
    for (const c of (inserted ?? []) as Contact[]) {
      if (c.phone) byPhone.set(c.phone, c);
    }
  }

  return phones.map((p) => byPhone.get(p)).filter((c): c is Contact => Boolean(c));
}

export async function fetchCustomValueIndex(
  supabase: SupabaseClient,
  contactIds: string[],
): Promise<Map<string, Map<string, string>>> {
  const index = new Map<string, Map<string, string>>();
  if (contactIds.length === 0) return index;

  const PAGE = 500;
  for (let i = 0; i < contactIds.length; i += PAGE) {
    const slice = contactIds.slice(i, i + PAGE);
    const { data } = await supabase
      .from('contact_custom_values')
      .select('contact_id, custom_field_id, value')
      .in('contact_id', slice);

    for (const row of data ?? []) {
      const bucket = index.get(row.contact_id) ?? new Map<string, string>();
      bucket.set(row.custom_field_id, row.value ?? '');
      index.set(row.contact_id, bucket);
    }
  }
  return index;
}
