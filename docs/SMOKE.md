# Smoke Harness

Скрипт `npm run smoke` прогоняет быстрые API-сценарии по ключевым ролям (Brand/Creator/Admin) без UI.

## Требования
- Запущенный сервер (`npm run dev` или `npm run start` после `npm run build`).
- Поднятая БД + миграции + сид:
  - `npm run db:up`
  - `npm run db:deploy`
  - `npm run db:seed`

## Переменные окружения
Минимально нужны:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `OUTBOX_CONSUMER_SECRET`

Опционально:
- `SMOKE_BASE_URL` (по умолчанию `http://localhost:3000`)
- `SMOKE_BRAND_EMAIL`, `SMOKE_BRAND_PASSWORD`
- `SMOKE_CREATOR_EMAIL`, `SMOKE_CREATOR_PASSWORD`
- `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD`
- `SMOKE_PAYOUT_AMOUNT_CENTS` (по умолчанию 1000)

## Запуск
```bash
npm run smoke
```

Если сервер живет не на 3000:
```bash
SMOKE_BASE_URL=http://localhost:4000 npm run smoke
```

## Что проверяет скрипт
- Public: `GET /api/jobs` (список заказов).
- Brand: создание draft заказа, перевод в `PUBLISHED` (модерация).
- Creator: apply -> withdraw.
- Inbox: отправка сообщения в существующий диалог.
- Escrow: попытка fund по job с escrow UNFUNDED.
- Payout: request -> cancel.
- Outbox: pull -> ack (через `OUTBOX_CONSUMER_SECRET`).

## Как интерпретировать вывод
- Любая ошибка приводит к завершению с кодом 1.
- При успехе выводится список выполненных шагов.

## Минимальный ручной прогон (UI)
- Brand: открыть `/dashboard/jobs/[id]/review` → убедиться, что эскроу отображается и действия работают.
- Creator: `/dashboard/work/[id]` → отправить материалы (confirm) → проверить появление версии.
- Inbox: `/dashboard/inbox/[id]` → увидеть линию новых сообщений и автоскролл.
- Balance: `/dashboard/balance` → проверить блокировку запроса выплаты при pending.
