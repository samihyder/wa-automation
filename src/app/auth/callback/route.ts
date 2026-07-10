import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withBasePath } from "@/lib/base-path";

function resolveNextPath(next: string | null, requestUrl: string): string {
  const fallback = "/dashboard";
  if (!next) return fallback;

  if (next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  try {
    const target = new URL(next);
    const origin = new URL(requestUrl).origin;
    if (target.origin === origin) {
      let path = target.pathname;
      const base = withBasePath("");
      if (base && path.startsWith(base)) {
        path = path.slice(base.length) || "/";
      }
      return `${path}${target.search}`;
    }
  } catch {
    // ignore malformed next
  }

  return fallback;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveNextPath(searchParams.get("next"), request.url);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${withBasePath(next)}`);
    }
  }

  const message =
    searchParams.get("error_description") ??
    searchParams.get("error") ??
    "auth_callback_failed";

  return NextResponse.redirect(
    `${origin}${withBasePath("/login")}?error=${encodeURIComponent(message)}`,
  );
}
