# Batch 6 Backlog - факты после Batch 5

## Основания
- Факт: в коде есть контур API contract, authz-хелперы и negative smoke (см. `scripts/smoke.ts`).
- Факт: добавлен worker для outbox и логика cursor/dedupe (см. `scripts/outbox-consumer.ts`, `docs/WORKERS.md`).
- Факт: платежи защищены уникальными reference в ledger, но нужна финальная проверка миграций и контрактов.
- Технические долги из Batch 5 остаются частично незакрытыми.

## P0 - блокеры продакшена

**B6-01: DB drift fix и безопасные миграции**  
Сценарий: `db:push` предупреждает о data loss, миграции расходятся.  
Где: `prisma/schema.prisma`, `prisma/migrations/*`, `README.md`.  
Готово, когда:  
- `npm run db:deploy` проходит без интерактива;  
- нет предупреждений о drop таблиц без явной миграции;  
- `prisma migrate status` без drift.

**B6-02: API contract coverage 100% для write-роутов**  
Сценарий: UI получает разноформатные ошибки.  
Где: `src/app/api/**/route.ts`, `src/lib/api/contract.ts`.  
Готово, когда:  
- все write-роуты возвращают `{ ok, data } / { ok:false, error }`;  
- `requestId` стабильно в ответах;  
- smoke не падает на форматах.

**B6-03: Payments invariants — финальная проверка**  
Сценарий: ретраи/двойные клики не должны менять баланс.  
Где: `src/lib/payments/*`, `src/app/api/escrow/*`, `src/app/api/payouts/*`.  
Готово, когда:  
- повторные fund/release/approve не меняют баланс;  
- уникальные reference защищают ledger;  
- `npm run smoke` проходит с ретраями.

## P1 - стабильность и производительность

**B6-04: Performance pass на фактах (PRISMA_QUERY_LOG)**  
Сценарий: нет измерений топ-N тяжелых запросов.  
Где: `src/lib/prisma.ts`, ключевые листинги `src/app/**/page.tsx`.  
Готово, когда:  
- зафиксирован список самых долгих запросов;  
- для них сделаны селекты/индексы/пагинация;  
- повторный прогон быстрее.

**B6-05: Завершить пагинацию и лимиты там, где остались "полные" выборки**  
Сценарий: большие списки без limit/cursor.  
Где: `src/app/**/page.tsx`, list API.  
Готово, когда:  
- все списки имеют limit/cursor + "Показать еще";  
- нет `findMany` без take на листингах.

**B6-06: Минимальный realtime (чат/уведомления)**  
Сценарий: пользователи не видят обновления без refresh.  
Где: `src/app/dashboard/inbox/[id]/page.tsx`, `src/app/dashboard/notifications/page.tsx`.  
Готово, когда:  
- поллинг или revalidate обновляет список;  
- новые сообщения/уведомления видны без ручного обновления.

## P2 - минимум polish и релизная готовность

**B6-07: Минимальные автотесты ядра**  
Сценарий: нет тестов на финансы/авторизацию.  
Где: новая папка `tests/` или `__tests__/`.  
Готово, когда:  
- есть тесты escrow/payout/authz;  
- есть `npm run test`.

**B6-08: Release docs и регресс-чеклист**  
Сценарий: разные команды запускают сервис по-разному.  
Где: `docs/SMOKE.md`, `README.md`, `docs/BATCH4_STATE.md`.  
Готово, когда:  
- единый путь запуска/миграций;  
- короткий регресс-чеклист.

## Release checklist (Batch 6)
- Env: `DATABASE_URL`, `NEXTAUTH_SECRET`, `OUTBOX_CONSUMER_SECRET`.
- DB: `npm run db:deploy` (без интерактива), seed в прод не использовать.
- Smoke: `npm run smoke` после миграций.
- Outbox worker: `npm run outbox:worker -- --watch`.
- AuthZ: negative smoke не должен падать.
- Финансы: повторные операции не меняют баланс.
