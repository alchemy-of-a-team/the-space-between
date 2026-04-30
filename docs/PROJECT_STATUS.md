# The Space Between -- Project Status

**Last updated:** 2026-04-30
**Version:** 0.1.1
**Repo:** github.com/alchemy-of-a-team/the-space-between
**Deploy:** https://the-space-between-production.up.railway.app
**Supabase:** lwmvrndcafikvwaiphex

## Current State

MVP deployed. Core functionality works: auth, shared space, reflections, artifact generation with DALL-E images. Significant quality gaps remain.

## What Works

- Landing page with product thesis and $125/mo pricing
- Coach login (rich@thetisconsulting.com / testpass123)
- Client login (alex@example.com / testpass123)
- Dashboard (practice view for coaches, engagement list for clients)
- Shared space with compound question pinned, chronological entries
- Post-session coach reflections (three fields, voice via Whisper)
- Emergence artifact generation via Claude API
- DALL-E 3 image generation per section (sequential, ~2 min total)
- Images stored in Supabase storage, URLs persisted in artifact content
- Artifact renderer (prose, comic strip, timeline formats)
- Invite system with shareable links
- Modular prompt library at src/lib/artifact/

## Known Issues

- Image quality from DALL-E 3 is generic/mediocre for coaching content
- DALL-E safety filters reject some coaching-related visual prompts
- Sequential image generation is slow (~2 min for 8 sections)
- Stripe integration is placeholder (mock subscription in seed data)
- No auto-deploy from GitHub was set up initially (manual railway up); now linked
- Auth had recursive RLS bug (fixed with JWT-based admin policies)
- No seed data for multiple clients (only Alex)

## Architecture

- Next.js 16 App Router + Supabase + Tailwind CSS 4 + shadcn/ui
- Anthropic Claude API (artifact text generation)
- OpenAI DALL-E 3 (artifact image generation)
- OpenAI Whisper (voice-to-text for reflections)
- Stripe Checkout (payment, placeholder)
- 7 tables: profiles, containers, entries, reflections, artifacts, invites, subscriptions
- Prompt is modular: src/lib/artifact/ (prompt.ts, format.ts, output-schema.ts, types.ts)

## Session Log

### 2026-04-29: Initial MVP build
- Scaffolded Next.js app, created GitHub repo
- Built all 7 tables with RLS policies
- Auth pages (login, signup, invite)
- Stripe integration (checkout, webhook, portal)
- All API routes
- Dashboard, shared space, artifact generation/view
- Voice transcription via Whisper
- Seed data (1 coach, 1 client, 10 entries, 6 reflections)
- Deployed to Railway
- Fixed: recursive RLS policies, button nesting hydration error, login redirect
- Added DALL-E 3 image generation per artifact section
- Fixed: image persistence (RLS update policy), safety filter workarounds

### 2026-04-30: Team review + security hardening (v0.1.1)
- 5-agent team review + contrarian second pass (17 findings fixed)
- Security: RLS hardening (subscriptions, invites, profiles), role escalation prevention, invite lockdown
- Frontend: Cormorant Garamond serif font, border-l-3 fix, console.log cleanup
- UX: close engagement confirmation dialog, error feedback on all user actions, human-readable status labels
- Accessibility: aria-labels, htmlFor/id linkage, billing button hidden from clients
- Infrastructure: pre-push hooks (team review gate, railway-up block), security migration 00002
- Pending: run migration 00002 on live Supabase DB
