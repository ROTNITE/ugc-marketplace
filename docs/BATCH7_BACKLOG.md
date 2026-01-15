# Batch 7 Backlog

## Контекст и входные данные
- Основано на `docs/BATCH6_BACKLOG.md`, `docs/BATCH6_STATE.md`, `docs/ARCHITECTURE.md`, `docs/UI_AUDIT.md`, `docs/WORKERS.md`.
- Batch 6 фактически дал: Telegram binding + worker, perf-select pass для inbox/notifications/admin lists, CI gate.
- Остается: чистые миграции для новых полей, полное покрытие API contract, финальные проверки payments, подтверждение perf через query-log.

## P0 - блокеры прод-готовности

**B7-P0-01: Миграции для Telegram binding без drift**  
Что сделать: оформить явную миграцию для полей `TelegramBindingRequest.status/attempts`, проверить `db:deploy` без предупреждений.  
Где: `prisma/schema.prisma`, `prisma/migrations/*`, `README.md`.  
Критерии:  
- `npm run db:deploy` без интерактива;  
- `prisma migrate status` без drift;  
- runtime ошибок по отсутствующим колонкам нет.  
Риски: потеря данных при некорректной миграции.  
Проверка: `npm run db:reset`, `npm run db:deploy`, `npm run db:seed`.

**B7-P0-02: API contract coverage 100% для write routes**  
Что сделать: привести все write-роуты к формату `{ ok, data } / { ok:false, error }` с `requestId`.  
Где: `src/app/api/**/route.ts`, `src/lib/api/contract.ts`, `src/lib/api/errors.ts`.  
Критерии:  
- нет ответов без `ok` в write-роутах;  
- UI/SMOKE обрабатывают `ok:false`;  
- ошибки имеют стабильные `error.code`.  
Риски: несовместимость UI при смене формата.  
Проверка: `npm run smoke`, негативные запросы на невалидный body.

**B7-P0-03: Payments invariants финальный аудит**  
Что сделать: убедиться, что `fund/release/payout approve` идемпотентны, `ledger.reference` уникален и ошибки корректно возвращаются.  
Где: `src/lib/payments/*`, `src/app/api/escrow/*`, `src/app/api/jobs/[id]/review/*`, `src/app/api/payouts/*`.  
Критерии:  
- повторные операции не меняют баланс;  
- `ledger.reference` уникален в БД;  
- `PAYMENTS_STATE_ERROR` и `INVARIANT_VIOLATION` приходят стабильно.  
Риски: двойные начисления/списания.  
Проверка: `npm run smoke` (ретраи), ручной end-to-end сценарий.

**B7-P0-04: Защита от "битой" сессии**  
Что сделать: на уровне `requireUser` проверять существование пользователя в БД и возвращать 401/403, чтобы не падать на FK.  
Где: `src/lib/authz.ts`, `src/lib/auth.ts`.  
Критерии:  
- при удаленном пользователе API отвечает 401/403;  
- отсутствуют ошибки `P2003` при создании записей.  
Риски: лишние DB запросы на каждую сессию.  
Проверка: удалить пользователя и повторить запросы на write-роуты.

## P1 - следующий слой ценности

**B7-P1-01: Telegram delivery - минимальный набор событий**  
Что сделать: зафиксировать список событий, которые обязаны доходить в Telegram, и подтвердить, что payload содержит `userId/creatorId/brandId`.  
Где: `src/app/api/**/route.ts` (emitEvent payload), `scripts/telegram-worker.ts`.  
Критерии:  
- сообщения доставляются для `MESSAGE_SENT`, `APPLICATION_ACCEPTED`, `ESCROW_FUNDED`, `SUBMISSION_SUBMITTED`, `PAYOUT_APPROVED`;  
- нет дубликатов и "слепых" событий без адресата.  
Риски: уведомления уходят не тому пользователю.  
Проверка: ручной прогон + лог воркера.

**B7-P1-02: Perf evidence через PRISMA_QUERY_LOG**  
Что сделать: собрать "до/после" по inbox/notifications/admin lists, добавить индексы только по факту запросов.  
Где: `src/lib/prisma.ts`, `prisma/schema.prisma`, `prisma/migrations/*`, `docs/BATCH6_STATE.md`.  
Критерии:  
- зафиксированы 3-5 самых тяжелых запросов;  
- добавлены индексы с комментариями;  
- время основных запросов снижается.  
Риски: drift миграций, лишние индексы.  
Проверка: `PRISMA_QUERY_LOG=1 npm run dev` + ручной проход.

**B7-P1-03: CI gate стабилизация**  
Что сделать: убедиться, что CI поднимает dev-сервер и smoke завершается всегда корректно; лог сервера сохраняется при падении.  
Где: `.github/workflows/ci.yml`, `scripts/smoke.ts`.  
Критерии:  
- CI ловит регрессии миграций/seed/smoke;  
- при фейле есть лог сервера.  
Риски: flaky CI из-за таймингов.  
Проверка: запуск CI в PR.

**B7-P1-04: Админ-UX блокеры**  
Что сделать: проверить доступность уведомлений и logout для админов, унифицировать навигацию.  
Где: `src/components/site-header.tsx`, `src/components/layout/admin-shell.tsx`, `src/app/admin/notifications/page.tsx`.  
Критерии:  
- админ может открыть уведомления и выйти из аккаунта.  
Риски: ломаем навигацию для других ролей.  
Проверка: ручной заход под админом.

## P2 - polish и наблюдаемость

**B7-P2-01: Observability v1**  
Что сделать: минимальные health endpoints для воркеров и структурированные логи с `requestId`.  
Где: `scripts/telegram-worker.ts`, `scripts/outbox-consumer.ts`, `docs/WORKERS.md`.  
Критерии:  
- воркеры пишут лог в едином формате;  
- есть команда проверки "живости".  
Риски: шум в логах.  
Проверка: ручной запуск воркеров.

**B7-P2-02: Локализация и терминология**  
Что сделать: убрать остатки англ. терминов в UI и статусах.  
Где: `src/app/**/page.tsx`, `src/components/**`, `src/lib/status-badges.ts`.  
Критерии:  
- нет англ. строк в UI;  
- статусы везде через `status-badges.ts`.  
Риски: незаметные места с ручными строками.  
Проверка: ручной UI прогон + `rg -n "Brand|Creator|Inbox|VERIFIED"`.

## Epic: Global Redesign (не выполнять в Batch 7)

**B7-EPIC-REDESIGN: Global Redesign**  
Цель: единая дизайн-система и mobile-first редизайн после стабилизации ядра.  
План:  
- Research: интервью/опросы, pain points, IA.  
- Design system: типографика, сетка, компоненты, токены.  
- Migration: Public -> Dashboard -> Admin, с контрольными чек-поинтами.  
Риски: срыв сроков из-за параллельных фич.  
Проверка: дизайн-ревью + прогон ключевых сценариев.

## Release checklist (Batch 7)
- `npm run db:deploy` без предупреждений о drift.
- `npm run smoke` проходит на CI и локально.
- Telegram worker доставляет базовые события.
- Payments ретраи безопасны (ledger не дублируется).
