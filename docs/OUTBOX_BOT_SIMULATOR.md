# Outbox Bot Simulator

Минимальный симулятор бота читает события из outbox, выводит их в консоль и делает ack.

## Быстрый старт
1) Запустите приложение локально:
   - `npm run db:up`
   - `npm run db:migrate`
   - `npm run dev`
2) Убедитесь, что в `.env` есть `OUTBOX_CONSUMER_SECRET`.
3) Запустите симулятор:
   - `npm run bot:simulate`

## Как работает
- Симулятор делает `GET /api/outbox/pull` с `Authorization: Bearer <OUTBOX_CONSUMER_SECRET>`.
- Печатает события в консоль.
- Делает `POST /api/outbox/ack` с массивом `ids`.
- Сохраняет курсор в `.outbox-cursor.json` (в корне проекта).

Курсор детерминированный: base64 от JSON `{ createdAt, id }`.

## Режим watch
```
npm run bot:simulate -- --watch
```
Интервал можно задать через `OUTBOX_POLL_INTERVAL` (в миллисекундах, по умолчанию 5000).

## Сброс курсора
Удалите файл `.outbox-cursor.json` и запустите симулятор снова.

## Пример вывода
```
[2026-01-08T10:12:03.456Z] MESSAGE_SENT (conversationId=..., jobId=...)
[2026-01-08T10:12:08.123Z] ESCROW_FUNDED (jobId=..., escrowId=...)
Done. Pulled 2 event(s).
```
