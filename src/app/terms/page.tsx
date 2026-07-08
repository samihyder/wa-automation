import type { Metadata } from "next";

import { TermsOfServiceContent } from "@/components/legal/terms-of-service-content";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getBrandName } from "@/lib/brand";
import { getTermsOfServiceUrl } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${getBrandName()} — rules for using our WhatsApp CRM platform.`,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: getTermsOfServiceUrl(),
  },
};

export default function TermsPage() {
  return (
    <LegalPageShell>
      <TermsOfServiceContent />
    </LegalPageShell>
  );
}
