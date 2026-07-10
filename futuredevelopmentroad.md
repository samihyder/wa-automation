# Mutex Systems — Future Development Roadmap

**Operator:** Mutex Systems / Digital Brandcast  
**Parent app:** FlowChat (Flow platform)  
**Child apps:** LeadMonitor (`keyword_automation`), WhatsApp Automation (`wa-automation`)  
**Domain:** https://www.digitalbrandcast.com  
**Last updated:** July 2026

This document captures planned features and **three-app integration** work. FlowChat is the parent CRM hub; LeadMonitor and wa-automation are specialized child apps that feed data into it and act on shared contacts.

---

## Ecosystem overview

```
                    ┌─────────────────────────────────────┐
                    │           FlowChat (parent)          │
                    │  CRM · Inbox · Email Marketing       │
                    │  Contacts (source of truth)          │
                    │  Neon PostgreSQL · fc_live_ API keys │
                    └──────────┬──────────────┬───────────┘
                               │              │
              ┌────────────────┘              └────────────────┐
              │ push leads / contacts                         │ push contacts / events
              ▼                                                 ▼
   ┌──────────────────────┐                      ┌──────────────────────┐
   │  LeadMonitor (child)  │                      │ wa-automation (child) │
   │  keyword_automation   │                      │ WhatsApp CRM          │
   │  Social lead scanning │                      │ Inbox · Broadcasts    │
   │  Supabase · orgs      │                      │ Supabase · accounts   │
   └──────────────────────┘                      └──────────────────────┘
              │                                                 │
              └──────────── optional direct link ─────────────┘
                    (Hot lead + phone → WhatsApp outreach)
```

### Customer journey (end-to-end)

```
LeadMonitor          FlowChat CRM           wa-automation
(find intent)   →    (qualify & store)  →   (WhatsApp outreach)
     │                    │                        │
 Reddit/Twitter/      Contact + labels        Template / flow /
 LinkedIn scan        Email campaign          Inbox conversation
```

| Stage | App | What happens |
|-------|-----|--------------|
| **1. Discover** | LeadMonitor | Keyword scan finds hire-intent posts on Reddit, Twitter, LinkedIn, etc. |
| **2. Qualify** | LeadMonitor | Agent verifies lead, rejects false positives, exports or syncs |
| **3. CRM** | FlowChat | Lead becomes a contact with source, platform, post URL, score |
| **4. Email nurture** | FlowChat Marketing | Segment → email campaign to leads with email addresses |
| **5. WhatsApp outreach** | wa-automation | Template/broadcast to contacts with phone numbers |
| **6. Close** | FlowChat + wa-automation | Conversation in inbox, deal in pipeline, agent handoff |

---

## What exists today

### FlowChat (parent) — `FlowChat/`

| Area | Status |
|------|--------|
| Omnichannel inbox (web widget, email) | ✅ Built |
| CRM contacts, labels, custom attributes, import/export | ✅ Built |
| Email marketing (campaigns, segments, templates) | ✅ Built |
| Integration API (`/api/integrations/v1/*`, `fc_live_` keys) | ✅ Built |
| LeadSnapper integration (reference pattern) | ✅ Built |
| Outbound webhooks (`contact.created`, `message.created`, etc.) | ✅ Built |
| Proxy to child apps | ✅ `/wa-automation`, `/lead-monitor` |
| LeadMonitor integration | ❌ Proxy only |
| wa-automation integration | ❌ Proxy only |

### LeadMonitor (child) — `keyword_automation/`

| Area | Status |
|------|--------|
| Multi-platform keyword scanning (Reddit, Twitter, Google, Discord, LinkedIn) | ✅ Built |
| Rules engine, categories, on-demand scans | ✅ Built |
| Leads inbox (verify, reject, export) | ✅ Built |
| Org-scoped multi-tenant (Supabase RLS) | ✅ Built |
| Railway Python worker | ✅ Built |
| FlowChat sync | ❌ Not built |
| Outbound webhooks | ❌ Not built |
| Public integration API | ❌ Not built |

**URLs:** `https://www.digitalbrandcast.com/lead-monitor` · `https://leadmonitor-psi.vercel.app/lead-monitor`

### WhatsApp Automation (child) — `wa-automation/`

| Area | Status |
|------|--------|
| Team inbox, contacts, pipelines, broadcasts | ✅ Built |
| Automations, flows, templates | ✅ Built |
| Public API (`/api/v1`, groundwork) | ✅ Partial |
| FlowChat sync | ❌ Not built |
| LeadMonitor sync | ❌ Not built |

**URLs:** `https://www.digitalbrandcast.com/wa-automation` · `https://wa-automation-neon.vercel.app/wa-automation`

---

## Integration architecture (realistic design)

### Principle: FlowChat owns the contact

All three apps share **one contact record in FlowChat**. Child apps do not each maintain a full CRM copy — they sync **into** FlowChat and read back via API when needed.

| System | Tenant key | Database | Role in integration |
|--------|------------|----------|---------------------|
| **FlowChat** | `accounts.id` | Neon PostgreSQL | **Hub** — contacts, timeline, marketing |
| **LeadMonitor** | `organizations.id` | Supabase | **Inbound** — pushes scanned leads |
| **wa-automation** | `accounts.id` | Supabase | **Outbound + inbox** — WhatsApp channel |

### Workspace mapping table (new — lives in FlowChat)

Link each FlowChat account to its child-app workspaces:

```sql
-- FlowChat: account_integrations
account_id          UUID  → accounts.id
integration_type    TEXT  → 'leadmonitor' | 'whatsapp_crm'
external_id         TEXT  → LeadMonitor organization_id OR wa-automation account_id
api_key_id          UUID  → optional fc_live_ key used for reverse calls
sync_enabled        BOOL
settings            JSONB → min_score, auto_whatsapp, etc.
```

Configured in **FlowChat → Settings → Integrations** (extend existing page).

### Integration pattern (copy LeadSnapper)

FlowChat already integrates LeadSnapper via:

- `POST /api/integrations/v1/leadsnapper/leads`
- Account setting: `leadsnapperSyncEnabled`, `leadsnapperMinPriority`
- Custom attribute provisioning on contact
- Dedup by external ID, email, or domain

**LeadMonitor and wa-automation should follow the same pattern** — dedicated inbound routes, provisioning UI, custom attributes, dedup rules.

---

## Phase 0 — Three-app integration (priority)

### 0.1 FlowChat hub — navigation & workspace linking

- [ ] FlowChat sidebar: **Lead Monitor**, **WhatsApp** as first-class nav items (not orphan proxy links)
- [ ] **Settings → Integrations**: link LeadMonitor `organization_id` and wa-automation `account_id` to FlowChat `account_id`
- [ ] Mutex super-admin: provision all three for a new client in one flow
- [ ] Consistent Mutex Systems branding across all three UIs

### 0.2 Single sign-on (SSO) — phased

**Phase 0.2a (quick):** Shared domain + deep links with workspace context in URL  
**Phase 0.2b (medium):** FlowAuth / token exchange — one login, session valid across `/dashboard`, `/lead-monitor`, `/wa-automation`  
**Phase 0.2c (long-term):** Shared identity provider (FlowChat `users` as master or unified Supabase)

| App | Auth today | SSO target |
|-----|------------|------------|
| FlowChat | Email/password, sessions table | Master |
| LeadMonitor | Supabase Auth, `profiles.organization_id` | Map user → FlowChat account |
| wa-automation | Supabase Auth, `profiles.account_id` | Map user → FlowChat account |

### 0.3 LeadMonitor → FlowChat (highest ROI)

**Trigger:** New lead verified in LeadMonitor, or auto-push on scan for high-confidence matches.

**FlowChat endpoint (new):**
```
POST /api/integrations/v1/leadmonitor/leads
Authorization: Bearer fc_live_...
```

**Payload (per lead):**
```json
{
  "source": "leadmonitor",
  "external_id": "<leads.id>",
  "organization_id": "<organizations.id>",
  "platform": "reddit|twitter|linkedin|...",
  "title": "Looking for a React developer...",
  "post_url": "https://...",
  "author": "username",
  "category": "freelance_hire",
  "score": 85,
  "matched_keywords": ["hire", "react"],
  "email": null,
  "phone": null,
  "verified_at": "2026-07-10T..."
}
```

**FlowChat actions:**
- Upsert contact (dedup: `leadmonitor_lead_id` custom attribute, then post URL, then author+platform)
- Set labels: `leadmonitor`, `hot-lead`, platform name
- Set custom attributes: `leadmonitor_post_url`, `leadmonitor_platform`, `leadmonitor_score`, `leadmonitor_category`
- Fire outbound webhook: `contact.created` → wa-automation can listen

**LeadMonitor changes:**
- [ ] Settings → **FlowChat sync** toggle + FlowChat API URL + `fc_live_` key
- [ ] On lead **verify** action → push to FlowChat
- [ ] Optional: auto-push leads above score threshold
- [ ] Store `flowchat_contact_id` on lead row for status sync back
- [ ] Bulk export → push selected leads to FlowChat (not just CSV)

**FlowChat changes:**
- [ ] `leadmonitor-sync.ts` (mirror `leadsnapper-sync.ts`)
- [ ] Settings → CRM → LeadMonitor provisioning section
- [ ] Custom attributes seeding (like LeadSnapper provisioning)

### 0.4 FlowChat → wa-automation (contacts & segments)

**Direction A — FlowChat pushes to wa-automation:**

```
POST wa-automation/api/v1/contacts  (or integration-specific route)
Authorization: Bearer wacrm_live_...
```

When FlowChat contact created/updated (especially from LeadMonitor):
- If phone present → upsert contact in wa-automation
- Apply tags matching FlowChat labels
- Store `flowchat_contact_id` on wa-automation contact

**Direction B — wa-automation pushes events to FlowChat:**

On WhatsApp `message.received`, `conversation.assigned`, `deal.won`:
```
POST FlowChat /api/integrations/v1/contacts/inbound
or use FlowChat outbound webhooks (preferred)
```

- Append WhatsApp activity to FlowChat contact marketing timeline
- Update custom attribute: `whatsapp_last_message_at`, `whatsapp_opted_out`

**FlowChat changes:**
- [ ] Settings → CRM → WhatsApp CRM provisioning (API key, wa-automation `account_id`)
- [ ] Register wa-automation webhook URL in FlowChat outbound webhooks
- [ ] Segment export: "contacts with phone + label hot-lead" → trigger wa-automation broadcast

**wa-automation changes:**
- [ ] Settings → Integrations → FlowChat (`fc_live_` key, `flowchat_account_id`)
- [ ] Contact sync job on create/update from FlowChat webhook
- [ ] `send_webhook` automation step already exists — document FlowChat event format
- [ ] Complete `/api/v1/contacts` write endpoints per `docs/public-api.md`

### 0.5 Cross-app automations (the “glue”)

Realistic automation chains using existing engines:

| Trigger | Action | Apps involved |
|---------|--------|---------------|
| LeadMonitor: lead verified, score ≥ 80 | Push to FlowChat contact + label `hot-lead` | LM → FC |
| FlowChat: contact created, source=leadmonitor, has phone | Upsert wa-automation contact + tag `new-lead` | FC → WA |
| FlowChat: contact created, has email only | Enroll in email nurture segment | FC |
| wa-automation: `first_inbound_message` | Update FlowChat contact attribute `whatsapp_engaged=true` | WA → FC |
| FlowChat: segment "hot leads with phone" | Start wa-automation broadcast (approved template) | FC → WA |
| LeadMonitor: lead verified, no phone/email | FlowChat task: "Research contact details" | LM → FC |

**Implementation:** FlowChat outbound webhooks + wa-automation automation triggers + LeadMonitor post-verify hook. No central message bus required for v1.

### 0.6 Unified contact timeline (FlowChat UI)

Single contact profile in FlowChat shows:

| Source | Data shown |
|--------|------------|
| LeadMonitor | Original post, platform, keyword match, score, verify date |
| FlowChat | Email campaigns sent, web chat history, notes, tasks |
| wa-automation | WhatsApp thread summary, last message, template broadcasts, deal stage |

- [ ] FlowChat contact detail: **LeadMonitor** panel (read from custom attributes + link to `/lead-monitor/leads?id=...`)
- [ ] FlowChat contact detail: **WhatsApp** panel (embed or link to wa-automation conversation)
- [ ] "Open in WhatsApp" button when phone exists and session window open

### 0.7 Status sync back to LeadMonitor

When agent acts on a lead in FlowChat or wa-automation, update LeadMonitor lead status:

| Event | LeadMonitor field |
|-------|-------------------|
| Pushed to FlowChat | `crm_sync_status = 'synced'`, `flowchat_contact_id` |
| WhatsApp message sent | `outreach_status = 'whatsapp_contacted'` |
| Email campaign sent | `outreach_status = 'email_contacted'` |
| Deal won in wa-automation | `outreach_status = 'converted'` |

- [ ] LeadMonitor API: `PATCH /api/leads/action` accepts external status updates (authenticated via service key)
- [ ] FlowChat / wa-automation call back on relevant events

---

## Phase 0 — Implementation order (realistic sprints)

| Sprint | Deliverable | Apps |
|--------|-------------|------|
| **S1** | Workspace linking UI + `account_integrations` table | FlowChat |
| **S2** | `POST /integrations/v1/leadmonitor/leads` + verify-hook push | FlowChat + LeadMonitor |
| **S3** | FlowChat contact → wa-automation contact upsert (phone dedup) | FlowChat + wa-automation |
| **S4** | wa-automation webhook → FlowChat timeline events | wa-automation + FlowChat |
| **S5** | FlowChat segment → wa-automation broadcast trigger | FlowChat + wa-automation |
| **S6** | Unified nav + contact profile panels | FlowChat |
| **S7** | SSO token exchange | All three |

---

## Phase 1 — Tech Partner essentials (wa-automation)

### 1.1 Meta Embedded Signup
- [ ] One-click “Connect WhatsApp” in Settings → WhatsApp

### 1.2 Partner multi-client dashboard
- [ ] Mutex admin: all client workspaces across FlowChat + LeadMonitor + wa-automation

### 1.3 WhatsApp analytics dashboard
- [ ] Message volume, delivery/read rates, per-agent stats

### 1.4 Click-to-WhatsApp + Events API
- [ ] Log business events to Meta for campaign attribution

---

## Phase 2 — Core CRM features (wa-automation + FlowChat)

### 2.1 Canned replies / quick replies
### 2.2 Business hours + auto-routing
### 2.3 SLA & overdue alerts
### 2.4 CSAT after close
### 2.5 Scheduled / snoozed follow-ups
### 2.6 Internal notes & @mentions
### 2.7 Conversation search
### 2.8 Opt-out & consent tracking (shared across email + WhatsApp)

---

## Phase 3 — WhatsApp-specific power features

### 3.1 Authentication templates (OTP)
### 3.2 WhatsApp Catalog / product messages
### 3.3 Native Meta WhatsApp Flows
### 3.4 Multi-number per workspace
### 3.5 WhatsApp Calling

---

## Phase 4 — LeadMonitor enhancements (feeds ecosystem)

### 4.1 Auto-push rules
- [ ] Push to FlowChat when score ≥ threshold without manual verify

### 4.2 Contact enrichment
- [ ] Attempt to find email/phone from post author profile before sync

### 4.3 LeadMonitor → wa-automation fast path
- [ ] "Send WhatsApp" on verified lead (if phone known) — calls wa-automation API directly with FlowChat contact ID

### 4.4 Scan analytics in FlowChat dashboard
- [ ] Widget: leads found today, verified, synced, converted

---

## Phase 5 — Platform & AI

### 5.1 Public API completion (wa-automation `/api/v1`)
### 5.2 Zapier / Make / n8n connector
### 5.3 AI suggested replies (wa-automation inbox)
### 5.4 AI lead scoring (combine LeadMonitor score + WhatsApp engagement in FlowChat)

---

## Phase 6 — Business & monetization

### 6.1 Subscription billing (Stripe) — per workspace across all three apps
### 6.2 Usage metering (scans, messages, seats)
### 6.3 White-label
### 6.4 Client onboarding wizard (connect all three apps in one flow)

---

## Quick wins (days, not weeks)

| Feature | App | Effort | Impact |
|---------|-----|--------|--------|
| FlowChat sidebar links to child apps | FlowChat | Low | Unified UX |
| LeadMonitor verify → manual CSV export with FlowChat field map | LeadMonitor | Low | Bridge until API sync |
| wa-automation `send_webhook` → FlowChat inbound contacts | wa-automation | Low | Event bridge |
| Shared contact dedup key documentation (phone > email > external_id) | All | Low | Prevents duplicates |
| FlowChat integration settings page stubs | FlowChat | Low | Sets up S1 |

---

## Repos, URLs & databases

| Repo | Product | Path on domain | Database |
|------|---------|----------------|----------|
| `FlowChat` | Flow (parent CRM) | `/dashboard`, `/marketing` | Neon PostgreSQL |
| `keyword_automation` | LeadMonitor | `/lead-monitor` | Supabase |
| `wa-automation` | WhatsApp Automation | `/wa-automation` | Supabase |

**Production domain:** https://www.digitalbrandcast.com  
**Proxy config:** `FlowChat/apps/web/vercel.json` rewrites child app paths

---

## What NOT to build (avoid duplication)

| Feature | Build in | Not in |
|---------|----------|--------|
| Contact master record | FlowChat | LeadMonitor, wa-automation |
| Email marketing | FlowChat | wa-automation |
| Social keyword scanning | LeadMonitor | FlowChat, wa-automation |
| WhatsApp inbox & templates | wa-automation | FlowChat, LeadMonitor |
| Full CRM pipeline UI | FlowChat (or wa-automation until merged) | Both long-term |

---

## Reference: LeadSnapper integration (copy this pattern)

FlowChat already ships the template for child-app integration:

- **Provision:** `POST /api/accounts/[accountId]/crm/leadsnapper/provision`
- **Inbound:** `POST /api/integrations/v1/leadsnapper/leads`
- **Settings:** `leadsnapperSyncEnabled`, `leadsnapperMinPriority`
- **Dedup:** external lead ID → email → domain
- **UI:** Settings → CRM → LeadSnapper section with API docs

Replicate for `leadmonitor` and `whatsapp_crm`.

---

## Notes

- Three separate databases today — integrate via **API + webhooks**, not shared DB (unless long-term merge into FlowChat monorepo).
- Meta App Review permissions drive wa-automation Phase 1.3 and 1.4.
- LeadMonitor Railway worker is independent — sync happens from web app on verify, not from Python scanner directly.
- Cron secrets required for wa-automation Wait steps — see `guide.txt` §9.
- FlowChat ecosystem plan (`FlowChat/docs/ecosystem-plan.md`) aligns with this roadmap — update that doc when Phase 0 ships.
