import type { ReactNode } from "react";
import {
  getLegalEntityName,
  getOriginalProjectAttribution,
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

export function PrivacyPolicyContent() {
  const entity = getLegalEntityName();
  const brand = getBrandName();
  const email = getPrivacyContactEmail();
  const policyUrl = getPrivacyPolicyUrl();
  const { project, developer, repoUrl } = getOriginalProjectAttribution();
  const effectiveDate = "July 8, 2026";

  return (
    <article className="space-y-8">
      <header className="space-y-2 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Effective date: {effectiveDate}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This Privacy Policy describes how {entity} (&quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;) collects, uses, shares, and
          protects personal information when you use {brand}, our WhatsApp
          customer relationship management platform (the &quot;Service&quot;),
          including messaging through the WhatsApp Business Platform provided
          by Meta Platforms, Inc. (&quot;Meta&quot; / &quot;WhatsApp&quot;).
        </p>
      </header>

      <Section title="1. About the Service and operator">
        <p>
          <strong className="text-foreground">{entity}</strong> independently
          operates, hosts, and supports this deployment of the Service. All
          customer support, account management, data processing, and ongoing
          maintenance for this instance are provided solely by {entity}.
        </p>
        <p>
          The Service is based on{" "}
          <a
            href={repoUrl}
            className="text-primary underline-offset-4 hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            {project}
          </a>
          , an open-source WhatsApp CRM template originally developed by{" "}
          <a
            href={repoUrl}
            className="text-primary underline-offset-4 hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            {developer}
          </a>{" "}
          on GitHub ({repoUrl}). {entity} has adapted and deployed this
          software for its own operations. {entity} is not affiliated with the
          original developer and is solely responsible for this production
          environment, its users, and the data processed within it.
        </p>
        <p>
          For questions about the upstream open-source project, refer to the
          repository above. For questions about this live Service — including
          support, billing, privacy, and data rights — contact {entity} using
          the details in Section 16.
        </p>
      </Section>

      <Section title="2. Who this policy applies to">
        <p>
          This policy applies to: (a) business users who create accounts and
          use the Service to manage WhatsApp conversations; (b) team members
          invited to a workspace; and (c) individuals (&quot;customers&quot; or
          &quot;contacts&quot;) who communicate with a business through
          WhatsApp numbers connected to the Service.
        </p>
        <p>
          If you interact with a business via WhatsApp, that business is the
          data controller for your conversation. {entity} processes data on
          behalf of the business as a service provider / data processor.
        </p>
      </Section>

      <Section title="3. Information we collect">
        <p>
          <strong className="text-foreground">Account and profile data.</strong>{" "}
          When you register, we collect your name, email address, password
          (stored hashed), optional profile photo, and workspace membership
          details.
        </p>
        <p>
          <strong className="text-foreground">WhatsApp messaging data.</strong>{" "}
          When a WhatsApp Business number is connected, we receive and store
          data transmitted through the WhatsApp Business Platform, including:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Phone numbers and WhatsApp profile names</li>
          <li>Message content (text, media, voice notes, documents)</li>
          <li>Message timestamps, delivery and read status</li>
          <li>Template names and variables used in outbound messages</li>
          <li>Conversation metadata (assignment, tags, notes, pipeline deals)</li>
        </ul>
        <p>
          <strong className="text-foreground">Contact and CRM data.</strong>{" "}
          Businesses may import or create contact records (name, phone, email,
          company, custom fields, tags) and upload CSV files.
        </p>
        <p>
          <strong className="text-foreground">Technical and usage data.</strong>{" "}
          We collect standard server logs (IP address, browser type, pages
          visited, timestamps) and authentication session data necessary to
          operate and secure the Service.
        </p>
      </Section>

      <Section title="4. How we use information">
        <p>We use personal information to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide, operate, and maintain the Service</li>
          <li>
            Send, receive, and display WhatsApp messages on behalf of connected
            businesses
          </li>
          <li>
            Run automations, flows, broadcasts, and CRM features requested by
            the business
          </li>
          <li>Authenticate users and enforce role-based access controls</li>
          <li>Monitor performance, prevent fraud, and improve security</li>
          <li>Comply with legal obligations and enforce our terms</li>
        </ul>
        <p>
          We do not sell personal information. We do not use WhatsApp message
          content to serve third-party advertising.
        </p>
      </Section>

      <Section title="5. WhatsApp and Meta">
        <p>
          The Service uses the official WhatsApp Business Platform (Cloud API).
          When messages are sent or received, data is processed by Meta in
          accordance with{" "}
          <a
            href="https://www.whatsapp.com/legal/business-terms"
            className="text-primary underline-offset-4 hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            WhatsApp Business Terms of Service
          </a>
          ,{" "}
          <a
            href="https://www.whatsapp.com/legal/business-policy"
            className="text-primary underline-offset-4 hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            WhatsApp Business Messaging Policy
          </a>
          , and{" "}
          <a
            href="https://www.facebook.com/privacy/policy"
            className="text-primary underline-offset-4 hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Meta&apos;s Privacy Policy
          </a>
          .
        </p>
        <p>
          Businesses using the Service are responsible for obtaining any
          required consents before messaging customers, using approved message
          templates for business-initiated outreach, and honoring opt-out
          requests in compliance with applicable law and WhatsApp policies.
        </p>
      </Section>

      <Section title="6. Marketing and transactional messages">
        <p>
          Messages sent through the Service may be transactional (e.g. customer
          support replies) or marketing (e.g. promotional broadcasts using
          approved templates). Businesses must only message individuals who
          have opted in where required by law.
        </p>
        <p>
          Customers may stop receiving marketing messages from a business by
          replying with opt-out keywords (such as &quot;STOP&quot;) where
          supported, by contacting the business directly, or by blocking the
          business number in WhatsApp.
        </p>
      </Section>

      <Section title="7. Legal bases for processing (EEA/UK)">
        <p>Where applicable, we rely on:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Contract</strong> — to provide
            the Service to account holders
          </li>
          <li>
            <strong className="text-foreground">Legitimate interests</strong> —
            to secure the platform, prevent abuse, and improve functionality
          </li>
          <li>
            <strong className="text-foreground">Consent</strong> — where
            required for specific processing (e.g. optional marketing by the
            business)
          </li>
          <li>
            <strong className="text-foreground">Legal obligation</strong> — to
            comply with applicable laws
          </li>
        </ul>
      </Section>

      <Section title="8. How we share information">
        <p>We share personal information only as needed to operate the Service:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Meta / WhatsApp</strong> — to
            deliver and receive messages via the WhatsApp Business Platform
          </li>
          <li>
            <strong className="text-foreground">Infrastructure providers</strong>{" "}
            — hosting (e.g. Vercel), database and authentication (e.g. Supabase),
            and related cloud services that store and process data under
            contractual safeguards
          </li>
          <li>
            <strong className="text-foreground">Workspace members</strong> — data
            within a business workspace is visible to authorized team members
            according to their role
          </li>
          <li>
            <strong className="text-foreground">Legal and safety</strong> — when
            required by law, court order, or to protect rights, safety, and
            security
          </li>
        </ul>
      </Section>

      <Section title="9. International data transfers">
        <p>
          Your information may be processed in countries other than your own,
          including the United States and the United Kingdom, where our service
          providers and personnel operate. We use appropriate safeguards (such
          as UK/EU standard contractual clauses) where required by applicable
          law.
        </p>
      </Section>

      <Section title="10. Data retention">
        <p>
          We retain personal information for as long as the business account is
          active or as needed to provide the Service. Message and contact data
          remain until deleted by the business or the account is closed. We may
          retain limited logs for security, backup, and legal compliance for a
          defined period thereafter.
        </p>
      </Section>

      <Section title="11. Security">
        <p>
          We implement technical and organizational measures including
          encryption of stored WhatsApp access tokens, row-level database
          security, HTTPS transport, webhook signature verification, and
          role-based access controls. No method of transmission or storage is
          100% secure; we cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="12. Your rights and choices">
        <p>
          Depending on your location — including under the UK GDPR, EU GDPR,
          and applicable United States state privacy laws — you may have the
          right to:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Access, correct, or delete your personal information</li>
          <li>Object to or restrict certain processing</li>
          <li>Data portability</li>
          <li>Withdraw consent where processing is consent-based</li>
          <li>Opt out of certain sales or targeted advertising (where applicable)</li>
          <li>Lodge a complaint with a supervisory authority</li>
        </ul>
        <p>
          <strong className="text-foreground">Account holders</strong> can
          update profile information in Settings and request account deletion
          by contacting us.
        </p>
        <p>
          <strong className="text-foreground">WhatsApp contacts / customers</strong>{" "}
          should contact the business that messaged you to exercise your rights
          regarding conversation data. You may also contact us at{" "}
          <a
            href={`mailto:${email}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {email}
          </a>{" "}
          and we will assist or forward your request to the relevant business.
        </p>
      </Section>

      <Section title="13. Data Protection Officer">
        <p>
          {entity} has appointed a dedicated <strong className="text-foreground">Data Protection Officer (DPO)</strong> to
          oversee privacy compliance, including under the UK GDPR, EU GDPR,
          and applicable United States privacy requirements.
        </p>
        <p>
          Our DPO is based in the <strong className="text-foreground">United Kingdom</strong>.
          The name and direct contact details of the Data Protection Officer
          will be provided upon request. To request DPO contact information,
          email{" "}
          <a
            href={`mailto:${email}?subject=Data%20Protection%20Officer%20contact%20request`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {email}
          </a>{" "}
          with the subject line &quot;Data Protection Officer contact
          request&quot; and a brief description of your inquiry.
        </p>
      </Section>

      <Section title="14. Children&apos;s privacy">
        <p>
          The Service is not directed to children under 13 (or the minimum age
          required in your jurisdiction). We do not knowingly collect personal
          information from children. If you believe a child has provided us data,
          contact us at{" "}
          <a
            href={`mailto:${email}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {email}
          </a>
          .
        </p>
      </Section>

      <Section title="15. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. We will post the
          revised policy at{" "}
          <a
            href={policyUrl}
            className="text-primary underline-offset-4 hover:underline"
          >
            {policyUrl}
          </a>{" "}
          and update the effective date above. Material changes may be notified
          through the Service or by email where appropriate.
        </p>
      </Section>

      <Section title="16. Contact us">
        <p>
          For privacy questions, data requests, support, or complaints, contact:
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
        <p>
          {entity} provides all management and support for this Service.
          The original open-source project ({project} by {developer}) is
          maintained separately on GitHub and is not responsible for this
          deployment.
        </p>
      </Section>
    </article>
  );
}
