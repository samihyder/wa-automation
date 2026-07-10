import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { verifyEcosystemToken } from '@/lib/ecosystem-sso';
import { appUrl } from '@/lib/app-url';

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: Request) {
  const secret = process.env.MUTEX_ECOSYSTEM_SSO_SECRET;
  if (!secret) {
    return NextResponse.redirect(appUrl('/login?error=sso_not_configured'));
  }

  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(appUrl('/login?error=missing_token'));
  }

  const payload = verifyEcosystemToken(token, secret, 'wa-automation');
  if (!payload) {
    return NextResponse.redirect(appUrl('/login?error=invalid_token'));
  }

  const admin = supabaseAdmin();
  const { data: users } = await admin.auth.admin.listUsers();
  const existing = users.users.find(
    (u) => u.email?.toLowerCase() === payload.email.toLowerCase()
  );

  if (!existing) {
    return NextResponse.redirect(
      appUrl(`/login?email=${encodeURIComponent(payload.email)}&error=no_account`)
    );
  }

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: payload.email,
    options: { redirectTo: appUrl('/dashboard') },
  });

  if (error || !linkData.properties?.action_link) {
    return NextResponse.redirect(appUrl('/login?error=sso_failed'));
  }

  return NextResponse.redirect(linkData.properties.action_link);
}
