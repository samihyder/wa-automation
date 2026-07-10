import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { withBasePath } from "@/lib/base-path";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

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

function loginErrorRedirect(origin: string, message: string) {
  return NextResponse.redirect(
    `${origin}${withBasePath("/login")}?error=${encodeURIComponent(message)}`,
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveNextPath(searchParams.get("next"), request.url);

  if (!code) {
    const message =
      searchParams.get("error_description") ??
      searchParams.get("error") ??
      "auth_callback_failed";
    return loginErrorRedirect(origin, message);
  }

  const redirectUrl = `${origin}${withBasePath(next)}`;
  const response = NextResponse.redirect(redirectUrl);
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Route handlers should allow cookie writes; ignore if not.
            }
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return loginErrorRedirect(origin, error.message);
  }

  return response;
}
