import type { MessageTemplate } from '@/types';
import { extractVariableIndices } from '@/lib/whatsapp/template-validators';
import type { SendTimeParams } from '@/lib/whatsapp/template-send-builder';

export type ContactFieldSource = {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
};

/** First token of the contact name — common for "Hi {{1}}," greetings. */
export function contactFirstName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/**
 * Default values for body {{1}}, {{2}}, … in order of common template usage.
 * {{1}} → first name, {{2}} → company, {{3}} → email, {{4}} → phone.
 */
export function defaultBodyValuesForContact(contact: ContactFieldSource): string[] {
  const first = contactFirstName(contact.name);
  const full = contact.name?.trim() ?? '';
  return [
    first || full,
    contact.company?.trim() ?? '',
    contact.email?.trim() ?? '',
    contact.phone?.trim() ?? '',
  ];
}

/**
 * Merge caller-supplied send params with contact-aware defaults.
 * Empty body slots are filled from the contact; header media falls back
 * to the template's stored public URL.
 */
export function buildSendParamsWithContactDefaults(
  template: MessageTemplate,
  contact: ContactFieldSource,
  provided: SendTimeParams = {},
): SendTimeParams {
  const varCount = extractVariableIndices(template.body_text).length;
  const defaults = defaultBodyValuesForContact(contact);
  const providedBody = provided.body ?? [];
  const body: string[] = [];

  for (let i = 0; i < varCount; i++) {
    const explicit = (providedBody[i] ?? '').trim();
    body.push(explicit || defaults[i] || defaults[0] || '');
  }

  const headerMediaUrl =
    provided.headerMediaUrl?.trim() ||
    template.header_media_url?.trim() ||
    undefined;

  return {
    ...provided,
    body,
    headerMediaUrl,
    headerText: provided.headerText?.trim() || undefined,
    buttonParams: provided.buttonParams,
  };
}
