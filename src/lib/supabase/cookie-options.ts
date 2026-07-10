import { withBasePath } from "@/lib/base-path";

/** Cookie path scoped to the app basePath so PKCE verifier survives subpath deploys. */
export function getSupabaseCookieOptions() {
  const path = withBasePath("") || "/";
  return { path };
}
