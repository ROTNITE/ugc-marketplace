# AGENTS

## Продукт
- Маркетплейс UGC-креаторов для рынка СНГ.
- Роли: Brand и Creator.
- Цель: связать заказ, отклик, чат и сделку в одном MVP-потоке.

## Tech stack
- Next.js 14 (App Router)
- NextAuth (Credentials)
- Prisma + PostgreSQL
- Tailwind CSS
- Zod

## Working agreements
- Всегда учитывать роли и доступы (Brand/Creator) в UI и API.
- Не добавлять новые зависимости без явной необходимости; при добавлении объяснять зачем.
- После правок прогонять `npm run lint` и `npm run typecheck`.
- Если трогаешь `prisma/schema.prisma` — прогоняй `npm run db:push` и проверяй `prisma/seed.ts`.
- UI-тексты — по-русски; интерфейс — лаконичный MVP.
- Делать небольшие порции изменений; избегать огромных "все сразу".

## Folder map
- `src/app` — страницы App Router и API-роуты.
- `src/components` — UI и общие компоненты.
- `src/lib` — prisma, auth, валидаторы, константы.
- `prisma` — `schema.prisma`, `seed.ts`.
- `docs` — архитектура и планы.

## Definition of Done
- Код готов и соответствует ролям и доступам.
- Проверки пройдены: `npm run lint`, `npm run typecheck`.
- Если менялся `prisma/schema.prisma` — выполнен `npm run db:push`, проверен `prisma/seed.ts`.
- Дано краткое резюме и шаги локальной проверки.
