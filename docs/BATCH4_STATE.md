# Batch 4 State (Regression Baseline)

Цель: зафиксировать состояние проекта перед Batch 4 (архитектура/стек/сборка/миграции/скрипты/критические проблемы) и дать опорный регрессионный список.

## Краткое резюме
- Репозиторий собирается и проходит проверки (`npm run check`, `npm run build` - OK).
- БД поднимается через Docker, миграции применяются через `db:deploy` (см. Known issues).
- Сид выполнен успешно, демо-аккаунты доступны.

## Stack и версии
- Next.js 14.x (build показывал 14.2.35).
- React 18.3.x.
- Prisma 5.22.x + PostgreSQL 16 (Docker).
- NextAuth (Credentials, JWT).
- Tailwind CSS 3.4.x.
- Zod 3.23.x, React Hook Form 7.52.x.
- Framer Motion 11.5.x.
- Node.js >= 20 (см. `package.json`).

## Скрипты и сборка
Ключевые команды из `package.json`:
- `npm run dev` - локальный dev.
- `npm run build` - продакшн сборка.
- `npm run check` - `lint + typecheck`.
- `npm run db:up` / `npm run db:down` - поднятие БД (Docker).
- `npm run db:migrate` - dev миграции (интерактивно).
- `npm run db:deploy` - применение миграций без интерактива.
- `npm run db:seed` - сид демо данных.
- `npm run bot:simulate` - симулятор Outbox.

## Переменные окружения (критичные)
Из `.env.example`:
- `DATABASE_URL` (PostgreSQL).
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`.
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.
- `OUTBOX_CONSUMER_SECRET`.
- Опциональные: `COMMISSION_BPS`, `TELEGRAM_BINDING_PEPPER`, `TELEGRAM_BINDING_SECRET`.

## Миграции и БД
- Всего миграций: 19 (см. `prisma/migrations/*`), последний: `20260115124819_add_indexes_v2`.
- Миграции применяются через `npm run db:deploy`.
- `npm run db:migrate` в non-interactive окружении падает (см. Known issues).
- Сид выполнен: `brand@example.com`, `creator@example.com`, `admin@example.com` / `password123`.

## Поиск TODO/FIXME
- `rg -n "TODO|FIXME|HACK|@ts-ignore|tsbuildinfo" .` - только упоминание в `pon.md`.
- TODO/FIXME в коде не обнаружены.

## Артефакты сборки
- `tsconfig.tsbuildinfo` исключен из git (добавлен в `.gitignore`, удален из индекса).

## Known issues / риски
- `prisma migrate dev` требует интерактива и не проходит в non-interactive среде. Для CI и регрессии использовать `npm run db:deploy`.
- Дрейф схемы устранен: модели `SavedJobAlert`/`SavedJobAlertHit` и Telegram-сущности возвращены в `schema.prisma`, добавлена миграция индексов `add_indexes_v2`.
- Нет автотестов (unit/integration).
- Чат не real-time (только серверный рендер/refresh).
- В Outbox нет встроенного consumer - нужен внешний процесс (см. `docs/OUTBOX_BOT_SIMULATOR.md`).

## Регрессионные сценарии (ручные)
Brand:
- `/dashboard/jobs` - списки и статусы, создание/редактирование.
- `/dashboard/jobs/[id]/applications` - отклики, accept/reject, переход в чат.
- `/dashboard/jobs/[id]/review` - эскроу, approve/request changes, споры.
- `/dashboard/deals` - табы по стадиям.

Creator:
- `/jobs`, `/jobs/[id]` - лента и отклик.
- `/dashboard/applications`, `/dashboard/invitations` - статусы.
- `/dashboard/work/[id]` - сдача работы, статус эскроу.
- `/dashboard/balance` - выплаты и история операций.

Admin:
- `/admin/jobs`, `/admin/creators` - модерация/верификация.
- `/admin/payouts`, `/admin/finance`, `/admin/events`.

Public:
- `/jobs`, `/jobs/[id]`, `/creators`, `/creators/[id]`, `/brands/[id]`.

## Smoke (в этом прогоне)
- CLI-сборка и линтер: OK.
- Миграции через `db:deploy`: OK.
- Сид: OK.
- Ручной прогон UI в браузере не выполнялся в этом окружении.

## Definition of Done для Batch 4
- Полная локализация и единая терминология.
- Все статусы выводятся через единый справочник.
- Единый паттерн EmptyState/Loader на всех списках.
- Единая система контейнеров и заголовков.
- Новый визуальный стиль применен к ключевым экранам.
- Регрессия ролей: CTA доступны только нужным ролям.
- `npm run check` и `npm run build` проходят.
- БД поднимается и миграции применяются без ручных шагов (или есть описанный обход).
