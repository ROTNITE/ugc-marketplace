# Batch 5 Backlog — факты и долги ядра

## Основания
- Smoke: `npm run smoke` проходит (последний прогон OK).
- Known issues: см. `docs/BATCH4_STATE.md` (db:migrate dev интерактивен, db:push предупреждает о data loss).
- В коде нет TODO/FIXME (`rg -n "TODO|FIXME|HACK"` — пусто).

## P0 — блокеры продакшена

**B5-01: Устранить drift схемы БД и data-loss предупреждения**  
Сценарий: `npm run db:push` предупреждает о drop таблиц `SavedJobAlert` и `TelegramBindingRequest`.  
Где: `prisma/schema.prisma`, `prisma/migrations/*`, `scripts/db-*`.  
Готово, когда:  
- `npm run db:deploy` проходит без интерактива;  
- `npm run db:push` не требует `--accept-data-loss`;  
- миграции явно фиксируют нужные таблицы/индексы (без потерь данных) либо документируют процедуру.

**B5-02: Завершить покрытие API Contract для всех write-роутов**  
Сценарий: часть API возвращает “сырой” JSON, UI ловит разноформатные ошибки.  
Где: `src/app/api/**/route.ts` (jobs/applications/invitations/submissions/disputes/admin).  
Готово, когда:  
- все write-роуты используют `ok/fail/parseJson` из `src/lib/api/contract.ts`;  
- ошибки всегда содержат `requestId`, `error.code`, `error.message`;  
- smoke проходит без регрессий.

**B5-03: AuthZ-аудит всех write-роутов**  
Сценарий: возможен доступ к чужим ресурсам через прямые API-запросы.  
Где: `src/lib/authz.ts`, `src/app/api/**/route.ts`, `scripts/smoke.ts`.  
Готово, когда:  
- все write-роуты используют helpers (`requireBrandOwnerOfJob`, `requireJobActiveCreator`, `requireConversationParticipant`, `requireAdmin`);  
- 401/403/404 единообразны;  
- smoke включает отрицательные сценарии и проходит.

**B5-04: Идемпотентность и уникальность денег (ledger/escrow/payout)**  
Сценарий: повторные клики/ретраи могут создать дубль движений денег.  
Где: `src/lib/payments/*`, `src/app/api/escrow/*`, `src/app/api/payouts/*`, `prisma/schema.prisma`.  
Готово, когда:  
- есть уникальные reference/keys для ledger-операций;  
- повторный fund/approve/request даёт 409 или no-op без изменения баланса;  
- смоук содержит ретраи и проходит.

## P1 — производительность и UX ядра

**B5-05: Снять perf‑базу и оптимизировать тяжелые запросы**  
Сценарий: нет фактических метрик, риск “тяжелых” списков.  
Где: `src/lib/prisma.ts` (PRISMA_QUERY_LOG), листинги `src/app/**/page.tsx`.  
Готово, когда:  
- зафиксирован список топ‑5 медленных запросов;  
- для них применены селекты/индексы/пагинация;  
- повторный прогон показывает улучшение.

**B5-06: Довести пагинацию до оставшихся списков**  
Сценарий: часть страниц всё ещё использует `take: 20` без курсора.  
Где: `src/app/dashboard/jobs/page.tsx`, `src/app/dashboard/balance/page.tsx`,
`src/app/dashboard/applications/page.tsx`, `src/app/dashboard/invitations/page.tsx`,
`src/app/dashboard/reviews/page.tsx`, `src/app/admin/disputes/page.tsx`, `src/app/admin/settings/page.tsx`.  
Готово, когда:  
- у всех листингов есть `limit/cursor` и “Показать ещё”;  
- payloadы ограничены select’ами по месту использования.

**B5-07: Автообновление чатов/уведомлений (минимальный realtime)**  
Сценарий: пользователи не видят новые сообщения без ручного refresh.  
Где: `src/app/dashboard/inbox/[id]/page.tsx`, `src/components/inbox/*`, `src/app/dashboard/notifications/page.tsx`.  
Готово, когда:  
- поллинг или revalidate по таймеру;  
- индикаторы “новое” корректно обновляются.

**B5-08: Прод‑процесс Outbox consumer**  
Сценарий: сейчас consumer — локальный скрипт без оркестрации.  
Где: `scripts/outbox-consumer.ts`, `docs/OUTBOX_BOT_SIMULATOR.md`.  
Готово, когда:  
- описан и реализован запуск как сервис (PM2/cron/systemd/worker);  
- есть логирование ошибок и retry‑политика в прод‑режиме.

## P2 — минимальный polish

**B5-09: Минимальные автотесты на критичные флоу**  
Сценарий: нет unit/integration тестов.  
Где: новая папка `tests/` или `__tests__/`, без тяжёлых зависимостей.  
Готово, когда:  
- есть тесты escrow/payout/authz;  
- они запускаются в CI или локально с `npm run test` (команда добавлена).

**B5-10: Документация релиза и регрессии**  
Сценарий: разные команды запускают проект по‑разному.  
Где: `docs/SMOKE.md`, `docs/BATCH4_STATE.md`, `README.md`.  
Готово, когда:  
- описан один “истинный” путь запуска/миграций;  
- есть краткий регресс‑чеклист (UI + API).

## Release checklist (Batch 5)
- Env: `DATABASE_URL`, `NEXTAUTH_SECRET`, `OUTBOX_CONSUMER_SECRET`, Telegram secrets.
- DB: `npm run db:deploy` (без интерактива), seed в прод не использовать.
- Smoke: `npm run smoke` после миграций.
- Outbox: consumer запущен как сервис, pull/ack проверен.
- Финансы: повторные fund/approve/payout не меняют баланс.
- AuthZ: отрицательные сценарии в smoke проходят.
