# Batch 10 State — Ground Truth vs фактическое состояние (as of Jan 23, 2026)

## Команды полного прогона (ожидаемые)
1) Проверки:
```bash
npm run check
```
2) Смоук:
```bash
npm run smoke
```
3) Миграции:
```bash
npx prisma migrate status
```

## Ground truth (политики)
1) Каталог креаторов: только `isPublic + VERIFIED` для не‑админов.
2) Публичный профиль креатора: доступен только при `isPublic && VERIFIED` (кроме админов).
3) Приглашения: отправка работает, нотификации создаются; не‑верифицированных нельзя приглашать (409/CONFLICT).
4) Сессия: при “битой” сессии возвращается 401 `SESSION_INVALID`.

## Фактическое состояние
- `npm run check`: OK.
- `npm run smoke`: OK (summary: moneyFlow=ok, authz=ok, retries=ok).
- `npx prisma migrate status`: OK (schema up to date).
- Seed baseline: E2E job фиксированный, PUBLISHED/APPROVED, escrow очищается; повторный `db:seed` не плодит дубликаты.
- Smoke: идемпотентный cleanup артефактов только для E2E job; baseline не маскируется на чистой базе.

## Риски / наблюдения
- Windows: возможен `EPERM` на Prisma engine при `db:reset` (закрыть dev/воркеры, перезапустить).
- Dev DX: fallback при DB down в public‑компонентах, preflight в smoke/workers.

## Компромиссы
- Smoke может корректировать статус E2E job **только при наличии артефактов**, чтобы повторный прогон не флакал.

## Фактические прогоны (as-of Jan 23, 2026)
- `git status -sb`: `## main...origin/main [ahead 3]` (+ локальные изменения `README.md`, `prisma/seed.ts`, `scripts/smoke.ts`, новые docs/BATCH10_*.md).
- `npm run check`: OK.
- `npm run smoke`: skipped (dev server not running).
- `npx prisma migrate status`: OK (schema up to date).
