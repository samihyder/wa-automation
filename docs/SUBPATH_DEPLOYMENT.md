# wacrm on a subpath (e.g. www.digitalbrandcast.com/wa-automation)

Use this when wacrm lives **under** your main marketing site instead of its own subdomain.

## URLs when configured

| Resource | URL |
|----------|-----|
| Login | `https://www.digitalbrandcast.com/wa-automation/login` |
| Dashboard | `https://www.digitalbrandcast.com/wa-automation/dashboard` |
| WhatsApp webhook | `https://www.digitalbrandcast.com/wa-automation/api/whatsapp/webhook` |

## 1. Vercel env vars (wa-automation project)

Set these on the **wa-automation** Vercel project, then **redeploy** (`basePath` is baked at build time):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/wa-automation` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.digitalbrandcast.com/wa-automation` |
| `ALLOWED_INVITE_HOSTS` | `www.digitalbrandcast.com,digitalbrandcast.com` |

Keep all other production vars (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `META_APP_SECRET`, etc.) as before.

## 2. Route traffic to wa-automation

Your **main site** (`www.digitalbrandcast.com`) must forward `/wa-automation` to the wa-automation deployment.

### Option A — Main site on Vercel

In the parent project `vercel.json`:

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

Replace `wa-automation-neon.vercel.app` with your wa-automation Vercel URL.

### Option B — Cloudflare / nginx

Proxy `/wa-automation/*` to `https://<wa-automation-vercel-url>/wa-automation/*`.

## 3. Supabase Auth

In Supabase → Authentication → URL configuration:

- **Site URL:** `https://www.digitalbrandcast.com/wa-automation`
- **Redirect URLs:** add `https://www.digitalbrandcast.com/wa-automation/**`

## 4. Meta WhatsApp webhook

Set callback URL to:

`https://www.digitalbrandcast.com/wa-automation/api/whatsapp/webhook`

## 5. Verify

1. Open `https://www.digitalbrandcast.com/wa-automation/login`
2. Sign in → dashboard at `/wa-automation/dashboard`
3. Settings → WhatsApp shows the webhook URL with the `/wa-automation` prefix

## Local dev with subpath (optional)

```bash
NEXT_PUBLIC_BASE_PATH=/wa-automation \
NEXT_PUBLIC_SITE_URL=http://localhost:3000/wa-automation \
npm run dev
```

App: `http://localhost:3000/wa-automation/login`

## Rollback to root deploy

Remove `NEXT_PUBLIC_BASE_PATH` (or set empty), set `NEXT_PUBLIC_SITE_URL` to your root URL, redeploy.
