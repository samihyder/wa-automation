import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isHttpMediaUrl, isEphemeralMetaMediaUrl } from '@/lib/whatsapp/template-header-media'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Local-only update of header_media_url used at send time.
 * Does NOT edit the Meta template (no re-review). Use this to replace
 * ephemeral Sync-from-Meta CDN sample URLs with a durable public URL.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid template id.' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    const accountId = profile?.account_id as string | undefined
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as { header_media_url?: string }
    const url = body.header_media_url?.trim() ?? ''
    if (!isHttpMediaUrl(url)) {
      return NextResponse.json(
        { error: 'header_media_url must be a public http(s) URL.' },
        { status: 400 },
      )
    }
    if (isEphemeralMetaMediaUrl(url)) {
      return NextResponse.json(
        {
          error:
            'That looks like a temporary Meta sample CDN URL. Upload the image to Storage (or paste a stable public URL) instead.',
        },
        { status: 400 },
      )
    }

    const { data: existing, error: lookupErr } = await supabase
      .from('message_templates')
      .select('id, header_type')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle()

    if (lookupErr || !existing) {
      return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
    }

    const mediaTypes = new Set(['image', 'video', 'document'])
    if (!existing.header_type || !mediaTypes.has(existing.header_type)) {
      return NextResponse.json(
        { error: 'Template does not have a media header.' },
        { status: 400 },
      )
    }

    const { data: updated, error: updErr } = await supabase
      .from('message_templates')
      .update({
        header_media_url: url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('account_id', accountId)
      .select('id, name, header_media_url, header_type')
      .single()

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, template: updated })
  } catch (err) {
    console.error('[templates/header-media]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update header media' },
      { status: 500 },
    )
  }
}
