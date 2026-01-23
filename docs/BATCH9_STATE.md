# Batch 9 State — Ground Truth vs фактическое состояние (as of Jan 23, 2026)

## Команды полного прогона (ожидаемые)
1) Проверки:
```bash
npm run check
```
2) Миграции:
```bash
npx prisma migrate status
```
3) При наличии БД:
```bash
npm run db:deploy
npm run db:seed
```

## Ожидаемые политики (ground truth)
1) Каталог креаторов: **только публичные + VERIFIED**.
2) Если `isPublic=true`, но **НЕ VERIFIED** — креатор **не попадает** в каталог и **не доступен** брендам из публичной части. В dashboard профиле должно быть предупреждение.
3) Приглашения: отправка работает, создаются уведомления адресатам; при попытке пригласить не‑верифицированного — понятная ошибка.

## Фактическое состояние (по коду сейчас)
### Каталог и профиль креатора
- Каталог (`src/app/creators/page.tsx`): для не‑админов применён `verifiedOnly=true`, показываются только `isPublic + VERIFIED`.
- Профиль креатора (`src/app/creators/[id]/page.tsx`): для не‑админов доступ только при `isPublic && VERIFIED`.
- Текст фильтров (`src/components/creators/creator-filters.tsx`): «Показаны публичные и верифицированные профили».
- Dashboard предупреждение (`src/components/creator/profile-form.tsx`): если `isPublic=true`, но не VERIFIED — предупреждение “в каталог не попадает”.

### Приглашения
- Отправка приглашений (`src/app/api/invitations/route.ts`): проверяет `verificationStatus === VERIFIED` и возвращает 409/CONFLICT + `CREATOR_NOT_VERIFIED`.
- Принятие приглашений (`src/app/api/invitations/[id]/accept/route.ts`): политика согласована с send.
- Уведомления по инвайтам: создаются (`INVITATION_SENT/ACCEPTED/DECLINED`) — см. `scripts/smoke.ts` проверки.

### Stale session
- Guard реализован в `src/lib/auth.ts` и `src/lib/authz.ts` через `STALE_SESSION`.
- Маппинг → 401 `SESSION_INVALID` в `src/lib/api/contract.ts`.
- UI‑обработка: `src/components/telegram/telegram-binding-card.tsx`.

### CI
- `.github/workflows/ci.yml`: build + start (NODE_ENV=production) + wait `/api/health` + smoke.

## Результаты команд/диагностики
- `git status -sb`: рабочее дерево **грязное** (много изменённых файлов и новых миграций).
- `npm run check`: **OK** (lint + typecheck).
- `npm run db:reset`: **OK**, но возможен Windows `EPERM` на Prisma engine (см. раздел ниже) — seed всё равно выполнен.
- `npm run smoke`: **OK** (summary: moneyFlow=ok, authz=ok, retries=ok).
- `npx prisma migrate status`: **OK** (Database schema is up to date).
- Grep `verifiedOnly|VERIFIED|isPublic`: подтверждает фактическую логику (см. выше).
- Grep инвайтов: `INVITATION_*` есть в API и smoke.
- Grep `STALE_SESSION|SESSION_INVALID`: есть в auth/authz/contract + UI.

## Мини‑инвентарь (ключевые файлы)
- Каталог/фильтрация: `src/app/creators/page.tsx`, `src/lib/creators/filters.ts`, `src/components/creators/creator-filters.tsx`.
- Профиль креатора: `src/app/creators/[id]/page.tsx`, `src/components/creator/profile-form.tsx`.
- Инвайты: `src/app/api/invitations/route.ts`, `src/app/api/invitations/[id]/accept/route.ts`, `src/app/api/invitations/[id]/decline/route.ts`.
- SESSION_INVALID: `src/lib/auth.ts`, `src/lib/authz.ts`, `src/lib/api/contract.ts`.

## P0 блокеры (актуально)
- Нет.

## Resolved in Batch 9
1) Политика каталога: `public + VERIFIED` восстановлена и согласована с публичным профилем + предупреждением в dashboard.
2) Приглашения: send/accept согласованы, для не‑верифицированных — стабильный 409/код.
3) Typecheck: TS2353 (outboundAt) устранён.
4) Миграции: `npx prisma migrate status` проходит без drift.

## План Batch 9 (ссылки)
- B9-P0-01: вернуть политику «каталог = public + VERIFIED» (код + тексты + инвайты).
- B9-P0-02: синхронизировать invite send/accept под одну политику.
- B9-P0-03: устранить TS2353 в telegram worker.
- B9-P0-04: стабилизировать migrate status (DB доступ/дрейф).

## Ручной кейс проверки “битой сессии”
1) Войти в аккаунт.
2) Выполнить `npm run db:reset` (seed выполнится автоматически).
3) Без выхода вызвать write‑действие (например, `/api/telegram/bind/request`).
4) Ожидается 401 `SESSION_INVALID`, не 500.

## Windows / Docker подсказка
- Если `db:*` падает с ошибкой о недоступном Postgres — запустите Docker Desktop и выполните `npm run db:up`.
- Проверьте `DATABASE_URL` в `.env`.
- `npm run db:reset` **уже выполняет seed автоматически** (через Prisma migrate reset).
- `npm run db:seed` нужен отдельно только если требуется пересидить без reset.

## Windows: EPERM Prisma engine
- Ошибка `EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp...` означает, что Prisma engine файл заблокирован.
- Остановите `npm run dev` и любые воркеры, которые используют Prisma.
- Закройте лишние `node` процессы (если зависли).
- Повторите `npm run db:reset`.
- Если повторяется — добавьте папку проекта в исключения Defender/AV.

## Логи API (requestId)
- Формат: JSON одной строкой. Фильтрация: `rg "requestId=..."` по логам.
- Пример: ищите `requestId` из ответа API в stdout сервера.

---
Примечание: это состояние **фиксирует факт**; исправления P0 закрыты в Batch 9.
