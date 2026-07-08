import type { ReactNode } from "react";
import {
  getLegalEntityName,
  getPrivacyContactEmail,
  getPrivacyPolicyUrl,
} from "@/lib/legal";
import { getBrandName } from "@/lib/brand";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function DataDeletionContent() {
  const entity = getLegalEntityName();
  const brand = getBrandName();
  const email = getPrivacyContactEmail();
  const privacyUrl = getPrivacyPolicyUrl();
  const effectiveDate = "July 8, 2026";

  return (
    <article className="space-y-8">
      <header className="space-y-2 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Data Deletion Instructions
        </h1>
        <p className="text-sm text-muted-foreground">
          Effective date: {effectiveDate}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This page explains how to request deletion of personal data processed
          by {entity} through {brand}. It is provided to meet Meta/Facebook app
          requirements and to help you exercise your privacy rights under
          applicable law (including UK GDPR, EU GDPR, and US state privacy
          laws).
        </p>
      </header>

      <Section title="1. Who can use these instructions">
        <p>
          <strong className="text-foreground">Account holders</strong> — users
          who created a login for the Service (owners, admins, agents).
        </p>
        <p>
          <strong className="text-foreground">WhatsApp contacts / customers</strong>{" "}
          — individuals who messaged a business using a WhatsApp number
          connected to the Service. In most cases the business is the data
          controller; {entity} processes data on their behalf.
        </p>
      </Section>

      <Section title="2. Delete your account (account holders)">
        <p>To request full deletion of your user account and associated workspace access:</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Email{" "}
            <a
              href={`mailto:${email}?subject=Account%20deletion%20request`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {email}
            </a>{" "}
            from the email address linked to your account.
          </li>
          <li>
            Use the subject line: <strong className="text-foreground">Account deletion request</strong>.
          </li>
          <li>
            Include your full name and the workspace or business name (if known).
          </li>
        </ol>
        <p>
          We will verify your identity and confirm deletion within{" "}
          <strong className="text-foreground">30 days</strong>, unless a longer
          period is required by law or to resolve an active dispute.
        </p>
      </Section>

      <Section title="3. Delete conversation or contact data">
        <p>
          If you are a <strong className="text-foreground">WhatsApp contact</strong> and
          want messages or your contact record removed:
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Contact the <strong className="text-foreground">business that messaged you</strong> first
            — they control the CRM data and can delete your contact and
            conversation from their workspace.
          </li>
          <li>
            If you cannot reach the business, email{" "}
            <a
              href={`mailto:${email}?subject=Data%20deletion%20request%20-%20WhatsApp%20contact`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {email}
            </a>{" "}
            with your phone number (including country code) and the business
            name or WhatsApp number that contacted you.
          </li>
        </ol>
        <p>
          We will forward your request to the relevant workspace administrator
          or delete data we directly control, where legally permitted.
        </p>
      </Section>

      <Section title="4. What we delete">
        <p>Depending on your request type, deletion may include:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>User account, profile, and authentication records</li>
          <li>Workspace membership and invite history</li>
          <li>Contacts, conversations, messages, tags, and notes</li>
          <li>Automations, flows, broadcasts, and related logs</li>
          <li>Uploaded media and custom field data</li>
        </ul>
        <p>
          We may retain limited information where required by law (e.g. billing
          records, fraud prevention, or legal claims) or in anonymized form
          for security and analytics.
        </p>
      </Section>

      <Section title="5. Meta / Facebook login data">
        <p>
          If you connected the Service through a Meta or Facebook login (where
          applicable), you may also remove the app from your Facebook account
          under <strong className="text-foreground">Settings → Apps and Websites</strong> in
          Facebook. That revokes future access but may not delete historical
          data already stored in the Service — email us to complete deletion.
        </p>
      </Section>

      <Section title="6. Data Protection Officer">
        <p>
          For GDPR-related deletion requests, you may also contact our Data
          Protection Officer. DPO contact details are provided upon request —
          email{" "}
          <a
            href={`mailto:${email}?subject=Data%20Protection%20Officer%20contact%20request`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {email}
          </a>{" "}
          with the subject line &quot;Data Protection Officer contact
          request&quot;. Our DPO is based in the United Kingdom.
        </p>
      </Section>

      <Section title="7. More information">
        <p>
          For full details on how we collect, use, and protect data, see our{" "}
          <a
            href={privacyUrl}
            className="text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
        <p>
          <strong className="text-foreground">{entity}</strong>
          <br />
          Email:{" "}
          <a
            href={`mailto:${email}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {email}
          </a>
        </p>
      </Section>
    </article>
  );
}
