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

## 2. Custom domain on wa-automation (recommended for standalone)

This app does **not** route through FlowChat. To use `www.digitalbrandcast.com/wa-automation`:

1. Vercel → **wa-automation** project → Settings → Domains
2. Add `www.digitalbrandcast.com`
3. Point DNS for `www` to Vercel (per the records Vercel shows)
4. Keep `NEXT_PUBLIC_BASE_PATH=/wa-automation` so routes live under `/wa-automation`

Visitors use `https://www.digitalbrandcast.com/wa-automation/login`. The site root `/` on that hostname redirects to `/wa-automation/login` via this project's `vercel.json`.

> **Note:** A hostname can only be attached to one Vercel project. If `www.digitalbrandcast.com` is already on another project (e.g. a marketing site), use **Option B** instead — or use a dedicated subdomain like `wa.digitalbrandcast.com` on the wa-automation project (no `basePath` needed).

## 3. Option B — Parent site proxies `/wa-automation`

If a **different** site owns `www.digitalbrandcast.com` (marketing site, Cloudflare, nginx — not FlowChat), add rewrites there:

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

Replace `wa-automation-neon.vercel.app` with your wa-automation production URL.

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
