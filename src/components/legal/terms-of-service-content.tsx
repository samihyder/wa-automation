import type { ReactNode } from "react";
import {
  getLegalEntityName,
  getOriginalProjectAttribution,
  getPrivacyContactEmail,
  getPrivacyPolicyUrl,
  getTermsOfServiceUrl,
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

export function TermsOfServiceContent() {
  const entity = getLegalEntityName();
  const brand = getBrandName();
  const email = getPrivacyContactEmail();
  const privacyUrl = getPrivacyPolicyUrl();
  const termsUrl = getTermsOfServiceUrl();
  const { project, developer, repoUrl } = getOriginalProjectAttribution();
  const effectiveDate = "July 8, 2026";

  return (
    <article className="space-y-8">
      <header className="space-y-2 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground">
          Effective date: {effectiveDate}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          These Terms of Service (&quot;Terms&quot;) govern your access to and
          use of {brand}, the WhatsApp customer relationship management
          platform operated by {entity} (the &quot;Service&quot;). By creating
          an account or using the Service, you agree to these Terms and our{" "}
          <a
            href={privacyUrl}
            className="text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </header>

      <Section title="1. About the Service">
        <p>
          {entity} independently operates, hosts, and supports this deployment
          of the Service. The software is based on the open-source project{" "}
          <a
            href={repoUrl}
            className="text-primary underline-offset-4 hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            {project}
          </a>{" "}
          originally developed by{" "}
          <a
            href={repoUrl}
            className="text-primary underline-offset-4 hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            {developer}
          </a>
          . {entity} provides all customer support and management for this
          production environment and is not affiliated with the original
          developer.
        </p>
      </Section>

      <Section title="2. Eligibility and accounts">
        <p>
          You must be at least 18 years old (or the age of majority in your
          jurisdiction) and authorized to bind your business to these Terms.
          You are responsible for safeguarding your login credentials and for
          all activity under your account and workspace.
        </p>
        <p>
          Information you provide must be accurate and kept up to date. You
          must notify us promptly of any unauthorized access to your account.
        </p>
      </Section>

      <Section title="3. Permitted use">
        <p>You may use the Service only for lawful business purposes. You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Send spam, unsolicited marketing, or messages without required consent</li>
          <li>Violate WhatsApp Business Messaging Policy or applicable telecom/marketing laws</li>
          <li>Harass, threaten, defraud, or impersonate others</li>
          <li>Upload malware, attempt unauthorized access, or disrupt the Service</li>
          <li>Use the Service to process data you do not have a lawful basis to process</li>
        </ul>
        <p>
          Businesses using the Service are solely responsible for obtaining
          opt-in consent where required and for the content of messages sent
          through their connected WhatsApp numbers.
        </p>
      </Section>

      <Section title="4. WhatsApp and third-party services">
        <p>
          The Service integrates with the WhatsApp Business Platform (Meta).
          Your use of WhatsApp messaging features is also subject to Meta&apos;s
          terms and policies. {entity} is not responsible for Meta service
          outages, policy enforcement actions, template approvals, or account
          restrictions imposed by Meta.
        </p>
        <p>
          The Service relies on third-party infrastructure (e.g. hosting and
          database providers). We are not liable for failures caused by those
          providers beyond our reasonable control.
        </p>
      </Section>

      <Section title="5. Your data and privacy">
        <p>
          Our collection and use of personal information is described in our{" "}
          <a
            href={privacyUrl}
            className="text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </a>
          . You retain ownership of the business data you upload or generate
          in the Service. You grant {entity} a limited license to host,
          process, and transmit that data solely to provide the Service.
        </p>
        <p>
          To request deletion of your data, see our{" "}
          <a
            href="/data-deletion"
            className="text-primary underline-offset-4 hover:underline"
          >
            Data Deletion Instructions
          </a>
          .
        </p>
      </Section>

      <Section title="6. Team workspaces and roles">
        <p>
          Workspace owners and admins may invite team members and assign roles.
          You are responsible for managing access within your organization and
          for actions taken by users you invite.
        </p>
      </Section>

      <Section title="7. Service availability and changes">
        <p>
          We strive to keep the Service available but do not guarantee
          uninterrupted or error-free operation. We may modify, suspend, or
          discontinue features with reasonable notice where practicable.
          Scheduled maintenance and security updates may cause temporary
          downtime.
        </p>
      </Section>

      <Section title="8. Disclaimer of warranties">
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot;
          without warranties of any kind, whether express or implied, including
          implied warranties of merchantability, fitness for a particular
          purpose, and non-infringement, to the fullest extent permitted by
          law.
        </p>
      </Section>

      <Section title="9. Limitation of liability">
        <p>
          To the fullest extent permitted by law, {entity} and its officers,
          employees, and contractors will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or for loss
          of profits, revenue, data, or goodwill, arising from your use of the
          Service.
        </p>
        <p>
          Our total liability for any claim relating to the Service is limited
          to the greater of (a) the amount you paid us for the Service in the
          twelve months before the claim, or (b) one hundred US dollars (USD
          $100), except where liability cannot be limited by applicable law.
        </p>
      </Section>

      <Section title="10. Indemnification">
        <p>
          You agree to indemnify and hold harmless {entity} from claims,
          damages, losses, and expenses (including reasonable legal fees)
          arising from your use of the Service, your messages or contact lists,
          your violation of these Terms, or your violation of any third-party
          rights or applicable law.
        </p>
      </Section>

      <Section title="11. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or
          terminate your access if you violate these Terms, pose a security
          risk, or if required by law or Meta policy. Upon termination, your
          right to access the Service ends; data retention and deletion are
          handled as described in our Privacy Policy and Data Deletion
          Instructions.
        </p>
      </Section>

      <Section title="12. Governing law">
        <p>
          These Terms are governed by the laws of England and Wales, without
          regard to conflict-of-law principles, except where mandatory local
          consumer protection laws apply in your jurisdiction.
        </p>
      </Section>

      <Section title="13. Changes to these Terms">
        <p>
          We may update these Terms from time to time. The current version will
          be posted at{" "}
          <a
            href={termsUrl}
            className="text-primary underline-offset-4 hover:underline"
          >
            {termsUrl}
          </a>{" "}
          with an updated effective date. Continued use of the Service after
          changes become effective constitutes acceptance of the revised Terms.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          Questions about these Terms? Contact {entity}:
        </p>
        <p>
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
