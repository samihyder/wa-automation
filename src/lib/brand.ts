/**
 * User-facing product branding. Mutex Systems operates this deployment;
 * the codebase is derived from the open-source wacrm project.
 */
export const BRAND = {
  name:
    process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Mutex Systems",
  tagline:
    process.env.NEXT_PUBLIC_BRAND_TAGLINE?.trim() || "WhatsApp CRM",
  monogram: "MS",
  colors: {
    turquoise: "#2DD4BF",
    aqua: "#06B6D4",
    gradient: "linear-gradient(135deg, #2DD4BF 0%, #06B6D4 100%)",
  },
  originalProject: "wacrm",
  originalDeveloper: "ArnasDon",
  originalRepoUrl: "https://github.com/ArnasDon/wacrm",
} as const;

/** Primary product name, e.g. page titles and sidebar. */
export function getBrandName(): string {
  return BRAND.name;
}

/** Short descriptor shown under the logo, e.g. auth pages. */
export function getBrandTagline(): string {
  return BRAND.tagline;
}

/** Monogram shown in the sidebar and favicon. */
export function getBrandMonogram(): string {
  return BRAND.monogram;
}

/** Full line for metadata: "Mutex Systems — WhatsApp CRM". */
export function getBrandTitle(): string {
  return `${BRAND.name} — ${BRAND.tagline}`;
}
