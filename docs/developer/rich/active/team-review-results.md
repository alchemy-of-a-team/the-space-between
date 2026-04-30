# Team Review Results: The Space Between MVP

**Date:** 2026-04-30
**Reviewers:** security-auditor, frontend-architect, ux-usability-reviewer, product-leader, technical-architect, contrarian-architect (second pass)
**Scope:** Entire codebase (initial MVP build)

## Status: APPROVED with fixes applied

All Act Now items have been addressed in this commit.

## Act Now (fixed)

1. **CRITICAL: Subscriptions RLS overbroad** -- `for all using(true)` gave every user full CRUD. Fixed: removed policy (service role bypasses RLS).
2. **HIGH: Invite POST accepted caller-supplied user_id** -- Fixed: now uses authenticated session user.
3. **HIGH: Profiles update allowed role escalation** -- Fixed: added `with check` preventing role changes.
4. **HIGH: Invites RLS public read-all** -- Fixed: removed `using(true)` policy, token lookup is server-side only.
5. **HIGH: Signup trigger trusted client-supplied role** -- Fixed: trigger only allows 'client' or defaults to 'coach', never 'admin'.
6. **HIGH: No serif font loaded** -- Fixed: Cormorant Garamond loaded via next/font/google.
7. **MODERATE: handleCloseEngagement fire-and-forget** -- Fixed: confirmation dialog, await, toast feedback.
8. **MODERATE: Stale migration file** -- Fixed: 00002_security_fixes.sql created with all corrections.
9. **MODERATE: Silent error handling** -- Fixed: entry submission, reflection save, voice recording, and transcription all show toast errors.
10. **MODERATE: Billing button visible to clients** -- Fixed: AppHeader accepts role prop, hides billing for non-coaches.
11. **LOW: border-l-3 invalid class** -- Fixed: changed to border-l-2.
12. **LOW: Debug console.logs** -- Fixed: removed from dashboard, middleware, and artifact generate route.
13. **LOW: alert() for generation errors** -- Fixed: replaced with Sonner toast.
14. **LOW: VoiceRecorder missing aria-label** -- Fixed: added aria-label and aria-hidden on SVG.
15. **LOW: Reflection labels no htmlFor/id** -- Fixed: added htmlFor and id attributes.
16. **LOW: Raw status strings in badges** -- Fixed: display map (Awaiting client, Active, Winding down, Complete).
17. **MODERATE: UNIQUE constraint missing on stripe_subscription_id** -- Fixed in migration 00002.

## Plan For Later

- Stripe email mismatch on signup (requires Stripe session lookup API)
- Long-running artifact generation (async queue architecture)
- Storage bucket in migration (reproducibility)
- Client signup without token creates orphan account
- Invite email verification
- Infographic renderer

## Dismissed

- CSS token mismatch (no visible bug)
- auth/callback open redirect (origin-prepended, not exploitable)
- Stripe webhook secret assertion (throws, doesn't silently pass)
- coach_margin_note in artifacts (by design, shared content)
- Prompt injection (content quality, not security)
- listUsers() O(n) (irrelevant at <50 users)
- isCoach duplication (3 instances is fine)
- Profiles insert policy (PK conflict prevents exploit, real risk is UPDATE which was fixed)
