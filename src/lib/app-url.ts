import { withBasePath } from "@/lib/base-path";

/**
 * Absolute URL for a route in this app. Client-side uses
 * `window.location.origin` + basePath; server-side prefers
 * `NEXT_PUBLIC_SITE_URL` (which should include the subpath when used).
 */
export function appUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${withBasePath(normalized)}`;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (site) return `${site}${normalized}`;
  return withBasePath(normalized);
}
