import { describe, expect, it } from 'vitest';
import type { MessageTemplate } from '@/types';
import {
  buildSendParamsWithContactDefaults,
  contactFirstName,
  defaultBodyValuesForContact,
} from './template-auto-fill';

const baseTemplate = (body: string): MessageTemplate =>
  ({
    id: 't1',
    name: 'test',
    body_text: body,
    header_type: 'image',
    header_media_url: 'https://cdn.example.com/header.jpg',
    language: 'en_US',
    category: 'Marketing',
    status: 'APPROVED',
  }) as MessageTemplate;

describe('contactFirstName', () => {
  it('returns the first token', () => {
    expect(contactFirstName('Sami Haider')).toBe('Sami');
  });
});

describe('buildSendParamsWithContactDefaults', () => {
  it('fills {{1}} with first name when body param is empty', () => {
    const params = buildSendParamsWithContactDefaults(
      baseTemplate('Hi {{1}}, welcome'),
      { name: 'Sami Haider', company: 'Mutex' },
      { body: [''] },
    );
    expect(params.body).toEqual(['Sami']);
  });

  it('preserves explicit body values', () => {
    const params = buildSendParamsWithContactDefaults(
      baseTemplate('Hi {{1}}'),
      { name: 'Sami Haider' },
      { body: ['Custom'] },
    );
    expect(params.body).toEqual(['Custom']);
  });

  it('falls back to template header_media_url', () => {
    const params = buildSendParamsWithContactDefaults(
      baseTemplate('Hi {{1}}'),
      { name: 'Sami' },
    );
    expect(params.headerMediaUrl).toBe('https://cdn.example.com/header.jpg');
  });
});

describe('defaultBodyValuesForContact', () => {
  it('orders first name, company, email, phone', () => {
    expect(
      defaultBodyValuesForContact({
        name: 'Ejaz Anwer',
        company: 'Abhi',
        email: 'ejaz@abhi.com',
        phone: '+923214633624',
      }),
    ).toEqual(['Ejaz', 'Abhi', 'ejaz@abhi.com', '+923214633624']);
  });
});
