# UGC Marketplace — Concept & Map

Краткий конспект для новых ИИ-агентов: что это за продукт, какие роли, где лежит код и как работают ключевые фичи.

## Продукт и роли
- Маркетплейс UGC для СНГ: бренды публикуют заказы на короткие видео, креаторы откликаются/получают приглашения, работают по эскроу, общаются в чате, сдают материалы, получают выплаты, оставляют отзывы.
- Роли: `GUEST`, `CREATOR`, `BRAND`, `ADMIN`. Навигация и доступы завязаны на роли (middleware + server-side authz helpers).

## Техстек
- Next.js 14 (App Router, server components) + TypeScript.
- NextAuth (Credentials).
- Prisma + PostgreSQL (docker-compose).
- Tailwind CSS, React Hook Form, Zod.
- Без внешних платёжных провайдеров: свой escrow/ledger/wallet + payout requests.

## Доменные сущности (Prisma)
- Users/Profiles: BrandProfile, CreatorProfile (верификация креатора, видимость в каталоге, анкета, прайсы, портфолио).
- Jobs: статус (DRAFT/PUBLISHED/PAUSED/IN_REVIEW/COMPLETED/CANCELED), moderationStatus, brief JSON, связи с brand и activeCreator.
- Applications/Invitations: уникальность на job, статусы, accept/reject/withdraw, связка с conversation.
- Conversations/Messages: чат, last activity в updatedAt, сообщения с senderId и временем.
- Deliverables: Submission + SubmissionItem, статусы SUBMITTED/CHANGES_REQUESTED/APPROVED.
- Payments: Wallet (per user), Escrow (per job), LedgerEntry (движения), PayoutRequest.
- Notifications: per user, isRead.
- OutboxEvent: очередь событий для внешнего бота.
- Reviews: взаимные отзывы (creator ↔ brand) после COMPLETED.
- PlatformSettings: commissionBps, defaultCurrency (singleton).

## Главные пользовательские флоу
- Лента /jobs (+ фильтры) только APPROVED + PUBLISHED.
- Деталь заказа: apply/withdraw, статус отклика, ссылка в чат при ACCEPTED, badge moderation/job status.
- Каталог креаторов /creators и публичный профиль /creators/[id]; публичный бренд /brands/[id].
- Invitations: бренд приглашает креатора, создаётся conversation и системное сообщение; креатор принимает/отклоняет.
- Inbox: /dashboard/inbox и /dashboard/inbox/[id] с явными авторами, бейджи ролей, ссылки на профили.
- Work/Review: креатор сдаёт Submission (версии, ссылки), бренд запрашивает правки или approves; после approve релиз escrow.
- Escrow/финансы: бренд пополняет escrow, при approve релиз → комиссия платформы → wallet креатора; payout requests; админ подтверждает/отклоняет выплаты; отмена сделки возвращает escrow.
- Notifications: создаются на ключевые события (apply, accept, message, submission, approve, escrow, payouts, moderation).
- Admin: модерация jobs, верификация креаторов, события (outbox), выплаты, настройки платформы, финансы (wallets/ledger/escrows), payouts approval.

## Карта директорий
- `prisma/schema.prisma` — модели, индексы (add_indexes_v1), enum’ы статусов; `prisma/seed.ts` — демо brand/creator, jobs, отзывы, настройки.
- `prisma/migrations/*` — актуальные миграции (init, payments, cancel/refund, settings, indexes и т.д.).
- `src/lib/`
  - `prisma.ts` — PrismaClient с env-check.
  - `auth.ts` / `authz.ts` — NextAuth конфиг, helpers requireRole/requireUser.
  - `env.ts` — обязательные переменные (DATABASE_URL и др.).
  - `outbox.ts` — emitEvent с защитой от падений.
  - `notifications.ts` — createNotification/markAllRead.
  - `payments/*` — комиссия (env + PlatformSettings), escrow/ledger helpers, safety checks.
  - `jobs/filters.ts` и `creators/filters.ts` — парсинг query + Prisma where/order.
- `src/app/` — App Router страницы и API:
  - Публичные: `/` (landing + role-aware home), `/jobs`, `/jobs/[id]`, `/creators`, `/creators/[id]`, `/brands/[id]`.
  - Dashboard (protected): jobs (лист, new, detail, applications, review), invitations, applications, work, inbox, notifications, balance, profile (creator/brand), reviews, deals (сводка сделок), payouts, settings.
  - Admin: `/admin` (панель + карточки), `/admin/jobs`, `/admin/creators`, `/admin/events`, `/admin/payouts`, `/admin/settings`, `/admin/finance` (wallets/ledger/escrows).
  - API: auth, jobs (publish/apply/review/cancel), applications withdraw, invitations (send/accept/decline), messages, submissions, escrow fund, payouts (request/cancel/admin approve/reject), notifications read, outbox pull/ack, admin finance adjust, settings update, verification, etc.
- `src/components/`
  - `ui/*` — кнопки, inputs, badges, alerts, tabs, cards.
  - `landing/*` — секции лендинга.
  - `inbox/*` — message composer, message list.
  - `home/*` — role-aware главная.
  - `deals/*` — вкладки/карточки сделок.
  - Разное: site-header (role-aware nav + unread badges), cards для dashboard/admin.
- `docs/` — архитектура, план бота.
- `scripts/` — docker check, db URL guard, db wait helpers.
- `docker-compose.yml` — Postgres (named volume, healthcheck).

## Как всё связано (коротко)
- Auth: NextAuth Credentials, session включает id/role; middleware защищает `/dashboard` и `/admin`.
- Доступы: server-side `requireRole` в страницах/API; UI скрывает нерелевантные CTA по роли.
- Модерация: PUBLISHED job попадает в /jobs только после APPROVED; admin меняет moderationStatus.
- Invitations/Applications: уникальные пары job+creator; accept создаёт conversation, ставит activeCreator, переводит job в PAUSED.
- Deliverables: submissions версионируются, job статус IN_REVIEW/PAUSED, approve → COMPLETED и релиз escrow.
- Payments: escrow создаётся на accept, fund бренд, release на approve; ledger фиксирует движения; wallet хранит баланс; payouts уменьшают баланс при запросе, админ подтверждает или возвращает.
- Notifications/Outbox: события пишутся безопасно; бот читает pull/ack по секрету.
- Reviews: обе стороны оставляют отзыв после COMPLETED; бренд рейтинги видны на публичной странице бренда, креатора — в каталоге/профиле.

## О чем помнить при доработках
- Не добавлять зависимости без необходимости; UI тексты по-русски; маленькие порции изменений.
- После схемы — миграция, не `db:push`; после правок — `npm run lint && npm run typecheck && npm run db:migrate` (если нужно) и по возможности `npm run check`.
- Всегда учитывать роли/ownership в UI и API; не показывать лишние CTA.
