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

## Perf (B6-PERF-02)
- Оптимизированы payload/select для inbox/messages/notifications и admin списков (jobs/creators/payouts/events/finance).
- Авто‑mark read в уведомлениях теперь только по видимым элементам (уменьшает write load).
- Query‑log не снимался в этой сессии: для фиксации «до/после» запустить `PRISMA_QUERY_LOG=1 npm run dev` и пройти inbox/notifications/admin lists.
