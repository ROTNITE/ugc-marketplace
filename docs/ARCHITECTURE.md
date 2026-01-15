# Architecture

## Overview
- Product: UGC marketplace for CIS. Brands publish jobs, creators apply or receive invitations, collaborate via chat, deliver submissions, get paid via escrow, and leave reviews.
- Roles: BRAND, CREATOR, ADMIN.
- App style: Next.js App Router with server components; client components for forms and interactions.

## Tech stack
- Runtime: Node.js >= 20.
- Frontend: Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion.
- Auth: NextAuth (Credentials), JWT session.
- Data: Prisma 5 + PostgreSQL 16 (Docker).
- Forms/validation: React Hook Form + Zod.
- Utilities: date-fns, bcryptjs.

## Repository layout
- `src/app`: App Router pages + API routes.
- `src/components`: UI primitives (`ui/*`) and feature components (jobs, inbox, payouts, etc.).
- `src/lib`: auth, authz, env, prisma client, payments, notifications, outbox, filters, validators.
- `prisma`: schema, migrations, seed.
- `docs`: product and technical docs.
- `scripts`: db helpers, outbox simulator.

## Routes and zones
### Public
- `/` (landing + role-aware home)
- `/login`, `/register`
- `/jobs`, `/jobs/[id]`
- `/creators`, `/creators/[id]`
- `/brands/[id]`

### Dashboard (Brand/Creator)
- `/dashboard` (role home)
- Brand jobs: `/dashboard/jobs`, `/dashboard/jobs/new`, `/dashboard/jobs/[id]/edit`
- Applications and review: `/dashboard/jobs/[id]/applications`, `/dashboard/jobs/[id]/review`
- Deals: `/dashboard/deals`
- Creator flows: `/dashboard/invitations`, `/dashboard/applications`, `/dashboard/work/[id]`
- Shared: `/dashboard/inbox`, `/dashboard/notifications`, `/dashboard/reviews`
- Creator finances: `/dashboard/balance`, `/dashboard/alerts`
- Profiles: `/dashboard/profile`

### Admin
- `/admin` (overview)
- `/admin/jobs`, `/admin/creators`, `/admin/payouts`, `/admin/finance`, `/admin/events`, `/admin/settings`
- `/admin/disputes`, `/admin/disputes/[id]`

### API
- Auth: `/api/auth/*`
- Jobs: `/api/jobs`, `/api/jobs/[id]`, `/api/jobs/[id]/apply`, `/api/jobs/[id]/submissions`, `/api/jobs/[id]/review/*`
- Applications/Invites: `/api/jobs/[id]/applications/*`, `/api/invitations/*`
- Escrow: `/api/escrow/[jobId]/fund`
- Payouts: `/api/payouts/*`, `/api/admin/payouts/*`
- Notifications: `/api/notifications/*`
- Outbox: `/api/outbox/pull`, `/api/outbox/ack`
- Admin: `/api/admin/*`
- Telegram binding: `/api/telegram/*`

## Domain model (Prisma)
- **User**: base account with `role`, one profile (creator or brand).
- **CreatorProfile / BrandProfile**: public data, verification, visibility.
- **Job**: core entity with platform/niche, budgets, deliverables, status + moderation status, `brief` JSON for extensions.
- **Application / Invitation**: creator -> job or brand -> creator relationship with status.
- **Conversation / Message / ConversationParticipant**: chat threads and messages.
- **Submission / SubmissionItem**: versioned deliverables with status and item URLs.
- **Escrow / Wallet / LedgerEntry / PayoutRequest**: payments, balances, ledger trail.
- **Notification**: user events with `isRead` and `href`.
- **Review**: mutual reviews after completion.
- **Dispute / DisputeMessage**: dispute workflow and messages.
- **PlatformSettings**: singleton for commission and default currency.
- **OutboxEvent**: integration queue for external bot.
- **PortfolioItem**: creator portfolio links.

Key enums: `Role`, `JobStatus`, `ModerationStatus`, `EscrowStatus`, `ApplicationStatus`, `SubmissionStatus`, `PayoutRequestStatus`, `DisputeStatus`.

## Core flows
### Brand
- Create job (draft) -> submit for moderation -> publish to feed.
- Review applications -> accept one -> job status becomes PAUSED, escrow created (UNFUNDED), chat created.
- Fund escrow -> creator submits -> brand reviews -> approve or request changes.
- Approve -> job COMPLETED -> escrow release (if funded) -> review.

### Creator
- Browse jobs -> apply or accept invitation -> chat.
- Submit deliverables (versioned) -> wait for approval or changes.
- Upon approval: escrow release credits wallet -> request payout.

### Admin
- Moderate jobs and creators.
- Approve/reject payout requests.
- Resolve disputes; view ledger and escrow activity.

## Backend and services
- **Auth**: `src/lib/auth.ts` (NextAuth config), `src/lib/authz.ts` (role/ownership helpers).
- **Env**: `src/lib/env.ts` validates `DATABASE_URL`, `NEXTAUTH_*`.
- **DB**: `src/lib/prisma.ts` Prisma client with singleton.
- **Payments**: `src/lib/payments/*` (escrow release/refund, commissions, currency conversion).
- **Notifications**: `src/lib/notifications.ts` helpers + notification API routes.
- **Outbox**: `src/lib/outbox.ts` for bot events, `docs/OUTBOX_BOT_SIMULATOR.md` for simulator.
- **Filters**: `src/lib/jobs/filters.ts`, `src/lib/creators/filters.ts`.
- **Validators**: `src/lib/validators.ts` (Zod schemas).

## Frontend architecture
- App Router with server components for data fetching.
- Client components for forms and interactions (React Hook Form, Zod).
- UI primitives in `src/components/ui/*` and feature components under `src/components/*`.
- Tailwind tokens mapped from `src/app/globals.css` into `tailwind.config.ts`.

## Security and access control
- Password hashing via bcryptjs.
- Middleware requires auth for `/dashboard`, `/admin`, and write APIs.
- Server-side checks: role and ownership guards in API routes and pages.

## Build, dev, and ops
- `npm run dev`, `npm run build`, `npm run start`.
- DB scripts: `db:up`, `db:migrate`, `db:seed`, `db:reset`, `db:deploy`.
- Postgres via `docker-compose.yml`.
- Outbox simulator: `npm run bot:simulate`.

## Testing status
- No unit/integration tests found (`__tests__`, `*.test.*`, `*.spec.*` are absent).

## Known gaps / tech debt (observed)
- No automated tests for critical flows (payments, disputes, authz).
- Chat is not real-time (no sockets/polling layer).
- Some UX flows still rely on raw status enums in pages not yet normalized.
- Telegram bot integration is outbox-only (consumer is external).

## Roadmap signals (from docs/README/CONCEPT)
- Expand moderation and verification UX.
- Improve escrow transparency and payout flows.
- Polish notifications and inbox UX.
- Prepare Telegram bot integration and more robust outbox processing.
