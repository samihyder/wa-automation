# Mutex WhatsApp CRM — BSP Feature Roadmap

**Product:** wa-automation (Mutex WhatsApp CRM)  
**Ecosystem:** FlowChat (parent CRM) · Lead Monitor (intent) · wa-automation (WhatsApp)  
**Last updated:** July 2026

This roadmap closes the gap vs WhatChimp, WATI, SleekFlow, and similar Meta BSP/marketing platforms, while preserving Mutex’s ecosystem moat (Lead Monitor → FlowChat → WhatsApp).

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Done | Shipped in production |
| 🚧 In progress | Active sprint |
| 📋 Planned | Scoped, not started |
| 🔄 Ecosystem | Lives in FlowChat / Lead Monitor, not wa-automation alone |

---

## Phase 0 — Marketing core (NOW)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 0.1 | **Scheduled broadcasts** | 🚧 | `scheduled_at` + cron executor |
| 0.2 | **Drip / nurture campaigns** | 🚧 | Multi-step template sequences with delays |
| 0.3 | Saved audience segments | 📋 | Reusable segment library (tags + filters) |
| 0.4 | Opt-out / STOP keyword + consent field | 📋 | Compliance for marketing sends |
| 0.5 | Broadcast cancel / reschedule UI | 📋 | Manage scheduled rows |

---

## Phase 1 — BSP onboarding & Meta ops

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.1 | Embedded Meta Signup | 📋 | Connect number in clicks |
| 1.2 | Multi-number / multi-WABA per workspace | 📋 | Agency use case |
| 1.3 | WABA quality & tier dashboard | 📋 | Template rejection insights |
| 1.4 | Click-to-WhatsApp / Meta Events API | 📋 | Paid acquisition attribution |
| 1.5 | Green tick verification wizard | 📋 | In-app guidance |

---

## Phase 2 — Agent productivity & support

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.1 | Canned replies / snippets | 📋 | |
| 2.2 | Business hours + auto-away | 📋 | |
| 2.3 | SLA timers | 📋 | |
| 2.4 | CSAT after resolve | 📋 | |
| 2.5 | Snooze + internal @mentions | 📋 | |
| 2.6 | Global conversation search | 📋 | |
| 2.7 | Wire stub automation triggers (`tag_added`, `time_based`, `assigned`) | 📋 | UI exists, not fired |
| 2.8 | Real round-robin assignment | 📋 | Currently first member |

---

## Phase 3 — AI & intelligence

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 3.1 | AI suggested replies (inbox) | 📋 | OpenAI / Anthropic via FlowChat credentials |
| 3.2 | AI chatbot (24/7 FAQ / qualify) | 📋 | WhatChimp-style |
| 3.3 | Sentiment / intent tags | 📋 | |

---

## Phase 4 — Integrations & API

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 4.1 | Complete `/api/v1` (messages, conversations, broadcasts) | 📋 | Partial today |
| 4.2 | Account-level outbound webhooks | 📋 | Beyond automation step |
| 4.3 | Zapier / Make / n8n | 📋 | |
| 4.4 | Shopify / WooCommerce cart triggers | 📋 | |
| 4.5 | Google Sheets sync | 📋 | |
| 4.6 | wa → FlowChat event push | 📋 | Inbound only today |
| 4.7 | FlowChat segment → broadcast trigger | 🔄 | FlowChat segments exist |

---

## Phase 5 — Commerce & advanced WhatsApp

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 5.1 | WhatsApp Catalog / product messages | 📋 | |
| 5.2 | Meta native WhatsApp Flows | 📋 | |
| 5.3 | WhatsApp Calling | 📋 | |
| 5.4 | OTP / authentication template UX | 📋 | Category in UI only |

---

## Phase 6 — Analytics & reporting

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 6.1 | Campaign analytics dashboard | 📋 | Beyond per-broadcast stats |
| 6.2 | Agent performance reports | 📋 | |
| 6.3 | Exportable CSV / BI connectors | 📋 | |
| 6.4 | Conversion / revenue attribution | 📋 | E-commerce |

---

## Ecosystem (Mutex differentiators — maintain)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| E.1 | Lead Monitor → FlowChat lead sync | ✅ | |
| E.2 | FlowChat → wa contact push | ✅ | API bridge |
| E.3 | Ecosystem SSO | ✅ | Sidebar handoff |
| E.4 | Enrichment flows (email/phone from social leads) | 🔄 | FlowChat |
| E.5 | Unified timeline (email + WhatsApp) | 📋 | FlowChat hub |
| E.6 | Lead verified → auto WhatsApp template | 📋 | Cross-app automation |

---

## Competitive positioning

**Do not compete head-on as “cheaper WhatChimp.”** Compete as:

> *Social intent → enriched contact → WhatsApp close — in one Mutex workspace.*

Close Phase 0–1 gaps so marketers are not blocked; double down on Ecosystem items competitors cannot copy.

---

## Suggested timeline

| Quarter | Focus |
|---------|-------|
| **Q3 2026** | Phase 0 (scheduled, drip, segments, opt-out) |
| **Q4 2026** | Phase 1–2 (embedded signup, canned replies, wire triggers) |
| **Q1 2027** | Phase 3–4 (AI replies, API, Zapier, FlowChat push) |
| **Q2 2027** | Phase 5–6 (catalog, analytics) |
