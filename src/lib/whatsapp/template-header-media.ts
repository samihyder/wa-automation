/**
 * Resolve the public media URL to use when sending a template with an
 * IMAGE/VIDEO/DOCUMENT header.
 *
 * Meta sync often stores the sample CDN URL in `header_handle` (not
 * `header_media_url`) when templates are created in Business Manager.
 * Resumable-upload handles (`4::…`) are creation-only and must NOT be
 * sent as `{ id }` — only http(s) values from header_handle are used.
 */

export type HeaderMediaSource = {
  header_media_url?: string | null;
  header_handle?: string | null;
};

export function isHttpMediaUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /^https?:\/\//i.test(value.trim());
}

export function resolveTemplateHeaderMediaUrl(
  template: HeaderMediaSource,
  override?: string | null,
): string | undefined {
  const explicit = override?.trim() || template.header_media_url?.trim();
  if (explicit) return explicit;

  const handle = template.header_handle?.trim();
  if (isHttpMediaUrl(handle)) return handle;

  return undefined;
}
