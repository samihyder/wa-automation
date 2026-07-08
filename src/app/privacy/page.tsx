import type { Metadata } from "next";

import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getBrandName } from "@/lib/brand";
import { getPrivacyPolicyUrl } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${getBrandName()} — how we collect, use, and protect your data.`,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: getPrivacyPolicyUrl(),
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell>
      <PrivacyPolicyContent />
    </LegalPageShell>
  );
}
