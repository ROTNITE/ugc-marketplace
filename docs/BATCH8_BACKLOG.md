# Batch 8 Backlog

## Контекст и факт Batch 7
- Сделано: Telegram delivery по 5 ключевым событиям, health/логи в Telegram worker, CI gate с `/api/health`, perf-индексы для inbox/notifications/admin finance, админские уведомления видны в хедере, logout доступен.
- Осталось: полное покрытие API contract для write-роутов, защита от битой сессии на всех write, доводка idempotency/конфликтов на платежах вне happy-path, наблюдаемость outbox worker, стабилизация Windows EPERM для Prisma generate (локально).

## P0 — блокеры прод-готовности

**B8-P0-01: API contract coverage 100% для write routes**  
Что сделать: пройтись по всем POST/PUT/PATCH/DELETE и привести ответы к `{ ok, data } / { ok:false, error }` с `requestId`, маппингом Prisma ошибок.  
Где: `src/app/api/**/route.ts`, `src/lib/api/contract.ts`, `src/lib/api/errors.ts`, `scripts/smoke.ts`.  
Критерии: нет write-роутов без `ok`; smoke пишет `requestId`/`error.code`; негативные тесты стабильно возвращают `VALIDATION_ERROR`.  
Проверка: `npm run smoke` + выборочные невалидные запросы.

**B8-P0-02: Stale session guard (DB-backed requireUser)**  
Что сделать: при write-операциях проверять существование `userId` в БД, возвращать `STALE_SESSION` вместо `P2003`.  
Где: `src/lib/auth.ts`, `src/lib/authz.ts`, write-роуты с `userId`.  
Критерии: удаленная сессия → 401/403, нет FK падений.  
Проверка: залогиниться → `db:reset` → write-операция = контрактная ошибка.

**B8-P0-03: Payments invariants финальный аудит**  
Что сделать: проверить idempotency и `reference` для всех платежных веток (cancel/reject/refund, повторные approve).  
Где: `src/lib/payments/*`, `src/app/api/escrow/*`, `src/app/api/payouts/*`, `src/app/api/admin/payouts/*`.  
Критерии: повторные операции не меняют баланс, всегда 409/INVARIANT, ledger не дублируется.  
Проверка: `npm run smoke` + параллельные запросы `Promise.all`.

## P1 — улучшения стабильности и наблюдаемости

**B8-P1-01: Outbox worker observability v1**  
Что сделать: единый формат логов + health output для `scripts/outbox-consumer.ts`.  
Где: `scripts/outbox-consumer.ts`, `docs/WORKERS.md`.  
Критерии: health-файл/print-health, логи без PII.  
Проверка: запуск воркера с `--once`/`--watch`.

**B8-P1-02: RequestId propagation end-to-end**  
Что сделать: при `ok:false` в UI/worker логировать `requestId` и endpoint; на сервере возвращать `x-request-id` везде.  
Где: `src/lib/api/contract.ts`, UI fetchers (forms/actions).  
Критерии: любой фейл содержит `requestId` в логах.  
Проверка: один проваленный запрос в UI.

**B8-P1-03: Минимальные интеграционные тесты поверх smoke**  
Что сделать: 2–3 теста (payments + authz) без UI, с фиксацией инвариантов.  
Где: новый `scripts/it-*.ts` либо расширение `scripts/smoke.ts`.  
Критерии: тесты повторяемы, без случайных данных.  
Проверка: запуск в CI.

**B8-P1-04: Windows EPERM mitigation (локально)**  
Что сделать: документировать workaround для `prisma generate` (закрыть node/tsserver/IDE), добавить подсказку в docs.  
Где: `docs/BATCH6_STATE.md` или `README.md`.  
Критерии: понятная инструкция, не ломает CI.  
Проверка: ручная.

## P2 — polish

**B8-P2-01: Локализация хвостов и терминология**  
Что сделать: добить остатки англ. строк и статусов.  
Где: `src/app/**`, `src/components/**`, `src/lib/status-badges.ts`.  
Критерии: `rg -n "Brand|Creator|Inbox|VERIFIED"` не находит UI строк.  

**B8-P2-02: Доп. perf-индексы по факту логов**  
Что сделать: при новых hot-запросах добавить минимальные индексы с комментариями.  
Где: `prisma/schema.prisma`, `prisma/migrations/*`, `docs/BATCH7_STATE.md` (или обновить `docs/BATCH6_STATE.md`).  
Критерии: индексы только под реальный where/orderBy, без drift.  

## Epic: Global Redesign (отдельно, не выполнять сейчас)

**B8-EPIC-REDESIGN: Global Redesign**  
Цель: единая дизайн-система + mobile-first, после стабилизации ядра.  
Этапы:  
1) Research: интервью/опросы, pain points, IA.  
2) Design system: типографика, сетка, компоненты, токены.  
3) Migration: Public → Dashboard → Admin с чек-поинтами.  
Критерии старта: ядро стабильно, smoke+CI зелёные, платежи закрыты.

## Release checklist (Batch 8)
- `npm run db:deploy` без drift.
- `npm run smoke` зелёный локально и в CI.
- Payments ретраи/конфликты устойчивы (ledger не дублируется).
- Telegram/outbox воркеры логируют health и requestId.
