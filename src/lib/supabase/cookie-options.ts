import { withBasePath } from "@/lib/base-path";

/** Cookie path for Supabase auth cookies. Use `/` so sessions work through
 *  the FlowChat proxy on digitalbrandcast.com; path-scoped cookies caused
 *  login to hang after signInWithPassword. */
export function getSupabaseCookieOptions() {
  return { path: "/" };
}
