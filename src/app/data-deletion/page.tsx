import type { Metadata } from "next";

import { DataDeletionContent } from "@/components/legal/data-deletion-content";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getBrandName } from "@/lib/brand";
import { getDataDeletionUrl } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Data Deletion Instructions",
  description: `How to request deletion of your data from ${getBrandName()}.`,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: getDataDeletionUrl(),
  },
};

export default function DataDeletionPage() {
  return (
    <LegalPageShell>
      <DataDeletionContent />
    </LegalPageShell>
  );
}
