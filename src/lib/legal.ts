import { appUrl } from "@/lib/app-url";
import { BRAND } from "@/lib/brand";

/** Legal entity name shown in privacy policy and Meta app settings. */
export function getLegalEntityName(): string {
  return (
    process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() || "Mutex Systems"
  );
}

/** Contact email for privacy requests (Meta requires a working address). */
export function getPrivacyContactEmail(): string {
  return (
    process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim() ||
    "privacy@digitalbrandcast.com"
  );
}

/** Public URL for the privacy policy — use in Meta Developer Console. */
export function getPrivacyPolicyUrl(): string {
  return appUrl("/privacy");
}

/** Public URL for Terms of Service — Meta App Settings → Basic. */
export function getTermsOfServiceUrl(): string {
  return appUrl("/terms");
}

/** Public URL for data deletion instructions — Meta App Settings → Basic. */
export function getDataDeletionUrl(): string {
  return appUrl("/data-deletion");
}

/** Open-source project this deployment is based on. */
export function getOriginalProjectAttribution() {
  return {
    project: BRAND.originalProject,
    developer: BRAND.originalDeveloper,
    repoUrl: BRAND.originalRepoUrl,
  };
}
