# UGC Marketplace (Skeleton)

**Goal:** working MVP skeleton for a СНГ-focused UGC creator marketplace (brands ↔ creators) with:
- email/password auth (roles: **Brand** / **Creator**)
- jobs feed with filters
- job detail + apply
- brand dashboard + create job
- basic data model for applications + chat + deliverables (UI stubs, ready to extend)

> This is a *skeleton* project meant to be iteratively improved with an AI coding agent.

---

## Tech stack

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS** (design tokens + future-ready)
- **Prisma + PostgreSQL** (docker-compose)
- **NextAuth (Credentials)** for authentication
- **Zod + React Hook Form** for validation/forms
- **Framer Motion** for future animations (already used in Hero)

---

## Quick start (local)

### 1) Requirements
- Node.js **20+**
- Docker (for Postgres). If `docker` is not found, install Docker Desktop and enable WSL integration.

### 2) Запуск с нуля за 2 минуты
```bash
# 1) env
cp .env.example .env
# set NEXTAUTH_SECRET to a long random string
# set OUTBOX_CONSUMER_SECRET to a secret token for bot access
# optional: set COMMISSION_BPS (basis points, 1500 = 15%)
# keep DATABASE_URL in sync with POSTGRES_* values

# 2) install deps
npm install

# 3) start database
npm run db:up

# 4) apply migrations
npm run db:migrate

# 5) seed demo data (optional)
npm run db:seed

# 6) run
npm run dev
```

Open: http://localhost:3000

Если видите ошибку про `DATABASE_URL`, проверьте, что `.env` создан и `npm run db:up` запущен.
Если ошибка `docker: not found` - установите Docker Desktop и включите WSL integration.
Если ошибка `Authentication failed` - проверьте пароль в `DATABASE_URL` и убедитесь, что локальный Postgres не перехватывает порт 5432.
Если меняли `POSTGRES_*`, выполните `npm run db:down && npm run db:up`, затем `npm run db:migrate`.
Если порт 5432 занят, поменяйте порт в `docker-compose.yml`, а затем обновите `DATABASE_URL` (и `POSTGRES_PORT`, если используете) и выполните `npm run db:down && npm run db:up`.
Если вы в WSL и `localhost` не достучался до Docker, задайте `POSTGRES_HOST` в `.env` (например, IP из `/etc/resolv.conf`).
Если после этого ошибка `Can't reach database server`, верните `POSTGRES_HOST` обратно и проверьте, нет ли локального Postgres на 5432.

### Если раньше использовали `db:push`
- Для dev проще всего пересоздать базу: `npm run db:reset` (удалит данные), затем `npm run db:seed`.
- Альтернатива: вручную пометить initial миграцию применённой через `prisma migrate resolve --applied <migration_name>`, но безопаснее пересобрать dev-базу.

### Как менять схему
1) Меняем `prisma/schema.prisma`
2) `npm run db:migrate -- --name <описание>` (генерирует миграцию и применяет в dev)
3) При деплое: `npm run db:deploy` (применяет накопленные миграции)
4) При необходимости наполнить данными: `npm run db:seed`
> `db:push` оставить как legacy для быстрых черновиков, но в основной работе используйте миграции.

### Demo accounts
- **Brand:** `brand@example.com` / `password123`
- **Creator:** `creator@example.com` / `password123`

### Настройки платформы (Admin)
- `/admin/settings`: комиссия (bps) и валюта по умолчанию.
- `COMMISSION_BPS` из `.env` используется как fallback, если настройки ещё не сохранены в админке.

---

## Интеграция Telegram-бота (пока заглушка)
- Бот хранит `OUTBOX_CONSUMER_SECRET` и раз в N секунд делает цикл:
  1) `GET /api/outbox/pull?limit=50&cursor=<lastCursor>` с `Authorization: Bearer <secret>`
  2) Отправляет события во внешний канал
  3) `POST /api/outbox/ack` с `{ ids: [...] }` для успешно доставленных событий
  4) Сохраняет `nextCursor` для следующего запроса
- Курсор детерминированный: base64 от JSON `{ createdAt, id }`.
- События с `processedAt` не возвращаются на фронт в каталоге - используйте `processedAt` для контроля доставки.
- Локальный симулятор бота: `docs/OUTBOX_BOT_SIMULATOR.md`.

## Payments v1 (mock)
- Escrow поток: `UNFUNDED` -> `FUNDED` -> `RELEASED`.
- Пополнение эскроу: бренд на странице приёмки `/dashboard/jobs/[id]/review`.
- Релиз: происходит при approve сдачи, если эскроу `FUNDED`.
- Комиссия: `commissionBps` из `/admin/settings` (fallback: `COMMISSION_BPS` из `.env`).
- Баланс креатора: `/dashboard/balance` + заявки на выплату (PayoutRequest).
- Права:
  - пополнять эскроу может только бренд-владелец заказа
  - релиз делает только бренд при approve сдачи
  - payout request может создавать только креатор при достаточном балансе
  - approve/reject payout делает только админ

## Outbox events for bot
Новые события по деньгам:
- `ESCROW_FUNDED`
- `ESCROW_RELEASED`
- `PAYOUT_REQUESTED`
- `PAYOUT_APPROVED`
- `PAYOUT_REJECTED`
Чтение/ack происходит через `/api/outbox/pull` и `/api/outbox/ack` (см. раздел выше).

## Future: Stripe Connect (plan)
- Для marketplace обычно нужен Stripe Connect, чтобы разделять деньги платформы и исполнителей.
- Типичный подход: separate charges and transfers, где платформа принимает платеж, а затем переводит исполнителю.
- Для реальных выплат потребуется KYC/онбординг креаторов, удобнее через Stripe-hosted/embedded onboarding.
- Это план без кода: сначала стабилизируем текущий escrow/ledger, затем подключаем Connect.

## Проверки
```bash
npm run check
```
Запускает `lint` и `typecheck`.

---

## Job filters (v1)

Параметры URL для `/jobs` и `/api/jobs` (можно шарить ссылку):
- `q` — поиск по названию и описанию
- `platform`, `niche`
- `currency`
- `minBudget`, `maxBudget`
- `minDeliverables`, `maxDeliverables`
- `minDurationSec`, `maxDurationSec`
- `formats` — список через запятую, например `formats=REVIEW,UNBOXING`
- `rightsPackage`
- `needsPosting`, `needsWhitelisting`, `shippingRequired` (`true/1/on`)
- `lang` (например `ru`/`en`/`uk`)
- `sort` — `new` (по умолчанию) или `budget`

---

## Project structure

```
src/
  app/                 # Next.js pages + API routes
  components/          # UI + app components
  lib/                 # prisma, auth, validators, constants
  types/               # TS module augmentation (next-auth)
prisma/
  schema.prisma
  seed.ts
docs/
  ARCHITECTURE.md
  FUTURE_TELEGRAM_BOT.md
  OUTBOX_BOT_SIMULATOR.md
```

---

## Design note

The UI is intentionally clean and simple, but already has:
- design tokens in `globals.css` and `tailwind.config.ts`
- reusable UI primitives in `src/components/ui/*`
- `framer-motion` wrapper patterns for future animations

We will **upgrade** the visual design later without rewriting the product logic.

---

## License
MIT (see LICENSE)
