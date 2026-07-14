/**
 * Resolve the public media URL to use when sending a template with an
 * IMAGE/VIDEO/DOCUMENT header.
 *
 * Meta sync often stores the sample CDN URL in `header_handle` (not
 * `header_media_url`) when templates are created in Business Manager.
 * Resumable-upload handles (`4::…`) are creation-only and must NOT be
 * sent as `{ id }` — only http(s) values from header_handle are used.
 *
 * WhatsApp CDN sample URLs (scontent.*, lookaside.*) are ephemeral and
 * usually 403 for Meta's own send-time media fetch — calling `/messages`
 * with those links accepts the send (single tick) then webhook-fails.
 */

export type HeaderMediaSource = {
  header_media_url?: string | null;
  header_handle?: string | null;
};

const EPHEMERAL_HOST_RE =
  /(^|\.)(scontent|lookaside)[\w.-]*\.(whatsapp\.net|fbsbx\.com|fbcdn\.net)$/i;

export function isHttpMediaUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /^https?:\/\//i.test(value.trim());
}

/** Meta template-sample CDN hosts — not reliable as send-time `link`. */
export function isEphemeralMetaMediaUrl(value: string | null | undefined): boolean {
  if (!isHttpMediaUrl(value)) return false;
  try {
    return EPHEMERAL_HOST_RE.test(new URL(value!.trim()).hostname);
  } catch {
    return false;
  }
}

/**
 * Prefer a durable public URL over ephemeral Meta sample CDN URLs.
 * Falls back to the CDN only when nothing else is stored (caller should
 * re-host before send).
 */
export function resolveTemplateHeaderMediaUrl(
  template: HeaderMediaSource,
  override?: string | null,
): string | undefined {
  const candidates = [
    override?.trim(),
    template.header_media_url?.trim(),
    isHttpMediaUrl(template.header_handle) ? template.header_handle!.trim() : undefined,
  ].filter(Boolean) as string[];

  const durable = candidates.find((url) => !isEphemeralMetaMediaUrl(url));
  if (durable) return durable;

  return candidates[0];
}

export function headerMediaNeedsRehost(url: string | null | undefined): boolean {
  return isEphemeralMetaMediaUrl(url);
}
