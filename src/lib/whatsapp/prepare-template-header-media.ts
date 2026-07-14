/**
 * Prepare IMAGE/VIDEO/DOCUMENT header media for a template send.
 *
 * Meta accepts the /messages call even when `image.link` points at an
 * ephemeral WhatsApp sample CDN URL, then later webhooks `failed`
 * (single tick → red X). We avoid that by:
 *   1. Preferring durable public URLs.
 *   2. Re-hosting reachable public media via Meta's /media upload and
 *      sending `{ id }` instead of `{ link }`.
 *   3. Failing clearly before the send when only an unreachable CDN
 *      sample URL is available — ask the user to set a public header
 *      image in Settings → Templates.
 */

import type { MessageTemplate } from '@/types';
import {
  headerMediaNeedsRehost,
  resolveTemplateHeaderMediaUrl,
} from '@/lib/whatsapp/template-header-media';
import { uploadMedia } from '@/lib/whatsapp/meta-api';
import type { SendTimeParams } from '@/lib/whatsapp/template-send-builder';

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_MIME = new Set(['video/mp4', 'video/3gpp']);
const DOCUMENT_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function expectedMimeSet(headerType: string): Set<string> | null {
  if (headerType === 'image') return IMAGE_MIME;
  if (headerType === 'video') return VIDEO_MIME;
  if (headerType === 'document') return DOCUMENT_MIME;
  return null;
}

function defaultFileName(headerType: string, mimeType: string): string {
  if (headerType === 'image') {
    return mimeType.includes('png') ? 'header.png' : 'header.jpg';
  }
  if (headerType === 'video') return 'header.mp4';
  return 'header.pdf';
}

export async function prepareTemplateHeaderMedia(params: {
  template: MessageTemplate;
  messageParams?: SendTimeParams;
  phoneNumberId: string;
  accessToken: string;
}): Promise<SendTimeParams> {
  const { template, phoneNumberId, accessToken } = params;
  const messageParams: SendTimeParams = { ...(params.messageParams ?? {}) };

  const headerType = template.header_type;
  if (!headerType || headerType === 'text') return messageParams;
  if (messageParams.headerMediaId?.trim()) return messageParams;

  const mediaUrl = resolveTemplateHeaderMediaUrl(
    template,
    messageParams.headerMediaUrl,
  );
  if (!mediaUrl) {
    throw new Error(
      `${headerType} header requires a media URL — go to Settings → Templates and set a public header image URL, or re-upload the header image.`,
    );
  }

  // Durable public URL can go as link; Meta sample CDN must be rehosted.
  if (!headerMediaNeedsRehost(mediaUrl)) {
    // Still upload when possible so Meta doesn't re-fetch our bucket at
    // delivery time. If download fails, fall through to link.
    try {
      const mediaId = await fetchAndUpload({
        mediaUrl,
        headerType,
        phoneNumberId,
        accessToken,
      });
      return {
        ...messageParams,
        headerMediaId: mediaId,
        headerMediaUrl: undefined,
      };
    } catch {
      return { ...messageParams, headerMediaUrl: mediaUrl };
    }
  }

  // Ephemeral CDN — try fetch once; usually 403.
  try {
    const mediaId = await fetchAndUpload({
      mediaUrl,
      headerType,
      phoneNumberId,
      accessToken,
    });
    return {
      ...messageParams,
      headerMediaId: mediaId,
      headerMediaUrl: undefined,
    };
  } catch {
    throw new Error(
      'This template’s header image is a temporary Meta sample URL and cannot be delivered. Open Settings → Templates, edit the template, and upload a public header image (JPEG/PNG), then send again.',
    );
  }
}

async function fetchAndUpload(args: {
  mediaUrl: string;
  headerType: string;
  phoneNumberId: string;
  accessToken: string;
}): Promise<string> {
  const { mediaUrl, headerType, phoneNumberId, accessToken } = args;
  const res = await fetch(mediaUrl);
  if (!res.ok) {
    throw new Error(`Header media URL returned ${res.status}`);
  }

  const contentType = (res.headers.get('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const allowed = expectedMimeSet(headerType);
  if (allowed && contentType && !allowed.has(contentType)) {
    throw new Error(`Unexpected media type ${contentType} for ${headerType} header`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.byteLength) throw new Error('Header media is empty');

  const mimeType =
    contentType && allowed?.has(contentType)
      ? contentType
      : headerType === 'image'
        ? 'image/jpeg'
        : headerType === 'video'
          ? 'video/mp4'
          : 'application/pdf';

  const { id } = await uploadMedia({
    phoneNumberId,
    accessToken,
    bytes,
    mimeType,
    fileName: defaultFileName(headerType, mimeType),
  });
  return id;
}
