import { requireApiKey } from '@/lib/auth/api-context';
import { normalizePhone } from '@/lib/whatsapp/phone-utils';
import { badRequest, ok, toApiErrorResponse } from '@/lib/api/v1/respond';

export async function POST(request: Request) {
  try {
    const ctx = await requireApiKey(request, 'contacts:write');
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      email?: string | null;
      flowchat_contact_id?: string;
      tags?: string[];
    };

    const phone = body.phone?.trim();
    if (!phone) {
      throw badRequest('phone is required');
    }

    const normalized = normalizePhone(phone);
    const name = body.name?.trim() || phone;

    const { data: existing } = await ctx.supabase
      .from('contacts')
      .select('id, name, email, flowchat_contact_id')
      .eq('account_id', ctx.accountId)
      .eq('phone_normalized', normalized)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await ctx.supabase
        .from('contacts')
        .update({
          name,
          email: body.email ?? existing.email,
          flowchat_contact_id: body.flowchat_contact_id ?? existing.flowchat_contact_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, name, phone, email, flowchat_contact_id')
        .single();

      if (error) throw error;
      return ok({ contact: updated, created: false });
    }

    const { data: account } = await ctx.supabase
      .from('accounts')
      .select('owner_user_id')
      .eq('id', ctx.accountId)
      .maybeSingle();

    const ownerUserId = ctx.createdBy ?? (account?.owner_user_id as string | undefined);
    if (!ownerUserId) {
      throw badRequest('Could not resolve account owner for contact insert');
    }

    const { data: created, error } = await ctx.supabase
      .from('contacts')
      .insert({
        account_id: ctx.accountId,
        user_id: ownerUserId,
        name,
        phone,
        email: body.email ?? null,
        flowchat_contact_id: body.flowchat_contact_id ?? null,
      })
      .select('id, name, phone, email, flowchat_contact_id')
      .single();

    if (error) throw error;

    if (body.tags?.length && created?.id) {
      for (const tagName of body.tags) {
        const { data: tagRow } = await ctx.supabase
          .from('tags')
          .insert({
            account_id: ctx.accountId,
            user_id: ownerUserId,
            name: tagName,
          })
          .select('id')
          .maybeSingle();
        if (tagRow?.id) {
          await ctx.supabase.from('contact_tags').insert({
            contact_id: created.id,
            tag_id: tagRow.id,
          });
        }
      }
    }

    return ok({ contact: created, created: true });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
