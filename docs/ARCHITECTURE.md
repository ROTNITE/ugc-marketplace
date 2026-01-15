# Architecture (skeleton)

## Domain
Marketplace where:
- **Brands** publish UGC jobs (packages of short vertical videos).
- **Creators** browse jobs with detailed filters and apply.
- Later: escrow, verification, chat improvements, dispute resolution, Telegram bot.

## Current MVP skeleton scope
- Auth (email/password) with roles: Brand / Creator
- Jobs: publish, browse, filter, detail
- Applications: apply to job (1 creator ↔ 1 job application)
- Conversations/messages: DB models + API stubs (UI can be extended)
- Deliverables/reviews: DB models ready

## Key design choices
1) **Structured job fields + `Job.brief (Json)`**
   - Most important filters are first-class columns for easy query.
   - `brief` is a flexible extension point to add fields without migrations.
2) **App Router + API routes**
   - UI pages are server components where possible.
   - Forms are client components (React Hook Form + Zod).
3) **Future-ready UI**
   - Tailwind tokens + component primitives allow later "premium" design/animations.

## Security notes
- Passwords are hashed (bcryptjs).
- API routes check session role for protected actions.
- Middleware protects `/dashboard` and write-API routes.

## What we will build next (high-level)
- Job wizard (multi-step) + draft saving
- Moderation/admin panel
- Verification flows (creator & brand)
- Better search (GIN indexes / later Meilisearch)
- Escrow / balances (region-specific provider)
