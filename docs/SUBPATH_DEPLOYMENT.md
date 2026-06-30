# wacrm on a subpath (standalone production)

wa-automation is its **own** Vercel project — independent of FlowChat or any other app.

Use a subpath when this deployment is served under a parent hostname, e.g.
`https://www.digitalbrandcast.com/wa-automation`.

## URLs when configured

| Resource | URL |
|----------|-----|
| Login | `https://www.digitalbrandcast.com/wa-automation/login` |
| Dashboard | `https://www.digitalbrandcast.com/wa-automation/dashboard` |
| WhatsApp webhook | `https://www.digitalbrandcast.com/wa-automation/api/whatsapp/webhook` |

Direct Vercel URL (no custom domain): `https://<your-project>.vercel.app/wa-automation/login`

## 1. Vercel env vars (wa-automation project only)

Set these on the **wa-automation** Vercel project, then **redeploy** (`basePath` is baked at build time):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/wa-automation` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.digitalbrandcast.com/wa-automation` |
| `ALLOWED_INVITE_HOSTS` | `www.digitalbrandcast.com,digitalbrandcast.com` |

Keep all other production vars (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `META_APP_SECRET`, etc.) on this project only.

## 2. Proxy `/wa-automation` on the domain owner (Option B)

`www.digitalbrandcast.com` is attached to the **FlowChat** Vercel project (domain
owner). wa-automation stays a **separate** Vercel project with its own env vars,
Supabase, and deploys — FlowChat only **proxies** `/wa-automation` traffic at the
edge.

In `FlowChat/apps/web/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/wa-automation",
      "destination": "https://wa-automation-neon.vercel.app/wa-automation"
    },
    {
      "source": "/wa-automation/:path*",
      "destination": "https://wa-automation-neon.vercel.app/wa-automation/:path*"
    }
  ]
}
```

Redeploy **FlowChat web** after changing this file. No wa-automation code or env
vars live in FlowChat.

## 3. Option A — Custom domain on wa-automation (alternative)

Only if `www.digitalbrandcast.com` is **not** already on another Vercel project:

1. Vercel → **wa-automation** → Settings → Domains → add `www.digitalbrandcast.com`
2. Point DNS per Vercel's records
3. Keep `NEXT_PUBLIC_BASE_PATH=/wa-automation`

Or use a dedicated subdomain (`wa.digitalbrandcast.com`) on wa-automation with no
`basePath`.

## 4. Supabase Auth

In **this app's** Supabase project → Authentication → URL configuration:

- **Site URL:** `https://www.digitalbrandcast.com/wa-automation`
- **Redirect URLs:** `https://www.digitalbrandcast.com/wa-automation/**`

## 5. Meta WhatsApp webhook

`https://www.digitalbrandcast.com/wa-automation/api/whatsapp/webhook`

## 6. Verify

1. `https://<wa-automation-vercel-url>/wa-automation/login` — works after deploy
2. Custom domain or parent proxy — `https://www.digitalbrandcast.com/wa-automation/login`
3. Settings → WhatsApp shows webhook URL with `/wa-automation` prefix

## Local dev with subpath (optional)

```bash
NEXT_PUBLIC_BASE_PATH=/wa-automation \
NEXT_PUBLIC_SITE_URL=http://localhost:3000/wa-automation \
npm run dev
```

## Rollback to root deploy

Remove `NEXT_PUBLIC_BASE_PATH`, set `NEXT_PUBLIC_SITE_URL` to your root URL (e.g. `https://wa-automation-neon.vercel.app`), redeploy.
