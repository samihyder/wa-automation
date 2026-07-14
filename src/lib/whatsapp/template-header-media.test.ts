import { describe, expect, it } from 'vitest';
import {
  headerMediaNeedsRehost,
  isEphemeralMetaMediaUrl,
  isHttpMediaUrl,
  resolveTemplateHeaderMediaUrl,
} from './template-header-media';

describe('resolveTemplateHeaderMediaUrl', () => {
  it('uses header_media_url when set', () => {
    expect(
      resolveTemplateHeaderMediaUrl({
        header_media_url: 'https://cdn.example.com/a.jpg',
        header_handle: '4::handle',
      }),
    ).toBe('https://cdn.example.com/a.jpg');
  });

  it('falls back to http(s) header_handle from Meta sync', () => {
    expect(
      resolveTemplateHeaderMediaUrl({
        header_media_url: null,
        header_handle: 'https://scontent.whatsapp.net/v/sample.png',
      }),
    ).toBe('https://scontent.whatsapp.net/v/sample.png');
  });

  it('prefers durable public URL over ephemeral Meta CDN sample', () => {
    expect(
      resolveTemplateHeaderMediaUrl({
        header_media_url: 'https://scontent.whatsapp.net/v/expired.png',
        header_handle: 'https://cdn.example.com/stable.jpg',
      }),
    ).toBe('https://cdn.example.com/stable.jpg');
  });

  it('ignores resumable upload handles', () => {
    expect(
      resolveTemplateHeaderMediaUrl({
        header_media_url: null,
        header_handle: '4::aW1hZ2U',
      }),
    ).toBeUndefined();
  });

  it('prefers explicit override', () => {
    expect(
      resolveTemplateHeaderMediaUrl(
        { header_media_url: 'https://old.com/x.jpg' },
        'https://new.com/y.jpg',
      ),
    ).toBe('https://new.com/y.jpg');
  });
});

describe('isHttpMediaUrl', () => {
  it('detects https URLs', () => {
    expect(isHttpMediaUrl('https://example.com')).toBe(true);
  });
});

describe('isEphemeralMetaMediaUrl / headerMediaNeedsRehost', () => {
  it('flags WhatsApp sample CDN hosts', () => {
    expect(
      isEphemeralMetaMediaUrl(
        'https://scontent.whatsapp.net/v/t61.29466-34/sample.png',
      ),
    ).toBe(true);
    expect(headerMediaNeedsRehost('https://cdn.example.com/a.jpg')).toBe(false);
  });
});
