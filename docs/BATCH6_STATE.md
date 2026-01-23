# Batch 6 State (Baseline)

## Что проходит
- `npm run check` — OK (lint + typecheck).
- `npm run db:reset` — OK (все миграции применены, seed выполнен; см. примечание про EPERM).
- `npm run db:deploy` — OK (нет pending migrations).
- `npm run db:seed` — OK (demo accounts созданы).
- `npm run smoke` — OK при запущенном `npm run dev`.
- `npm run outbox:worker -- --once` — OK при заданном `OUTBOX_CONSUMER_SECRET`.

## Что не проходит
- `npm run smoke` без запущенного dev-сервера — падает с понятным сообщением.
- `npm run outbox:worker -- --once` без `OUTBOX_CONSUMER_SECRET` — выходит с ошибкой.

## Полный прогон (локально)

1) База данных:

```bash
npm run db:reset
npm run db:deploy
npm run db:seed
```

2) Проверки:

```bash
npm run check
```

3) Dev + smoke:

```bash
npm run dev
```

В другом окне:

```bash
npm run smoke
```

4) Outbox worker:

```bash
OUTBOX_CONSUMER_SECRET=... npm run outbox:worker -- --once
```

## Env requirements
- `DATABASE_URL` (Postgres)
- `NEXTAUTH_SECRET`
- `OUTBOX_CONSUMER_SECRET` (для outbox worker и smoke outbox-проверок)
- (опционально) `SMOKE_BASE_URL` для smoke

## P0 блокеры / риски
- Smoke не проходит без запущенного dev-сервера (нужен `npm run dev`).
- Outbox worker требует `OUTBOX_CONSUMER_SECRET`; без него не стартует.

## Примечания
- При `npm run db:reset` один раз появлялась ошибка `EPERM` на rename Prisma query engine - повторный запуск/закрытие процессов обычно снимает блокировку.
- `tsconfig.tsbuildinfo` исключен из git (артефакт сборки).
- Preflight в smoke сообщает, если сервер недоступен (инструкция по запуску).

## Perf (B7-P1-02)
Метод: запуск одноразовых запросов Prisma на seed-данных с теми же `where/orderBy`, что и в экранах inbox/notifications/admin (см. скрипт-запросы в задаче).

До/после (ms):
- inbox_conversations: 2.97 -> 2.94
- notifications: 2.51 -> 2.44
- admin_payouts: 2.29 -> 1.99
- admin_events: 1.96 -> 1.82
- admin_wallets: 3.66 -> 3.50
- admin_escrows: 4.35 -> 4.83
- admin_ledger: 2.56 -> 2.00

Добавленные индексы:
- Notification `(userId, createdAt, id)` — список уведомлений.
- Message `(conversationId, createdAt, id)` — список сообщений.
- Wallet `(updatedAt, id)` — admin финансы (кошельки).
- Escrow `(createdAt, id)` — admin финансы (эскроу).
