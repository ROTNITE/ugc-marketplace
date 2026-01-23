# Workers

## Outbox worker

Отдельный процесс для обработки событий outbox (например, для Telegram).

### Запуск

```bash
npm run outbox:worker -- --watch --interval 2000
```

Однократный прогон:

```bash
npm run outbox:worker -- --once
```

### Параметры

- `--once` — один цикл pull -> ack и завершение.
- `--watch` — постоянный polling.
- `--interval <ms>` — интервал polling (по умолчанию 5000).
- `--max-batch <n>` — размер пачки (1..100, по умолчанию 50).
- `--max-retries <n>` — число ретраев при сетевых ошибках (по умолчанию 5).
- `--cursor-file <path>` — путь к файлу курсора (по умолчанию `.outbox-cursor.json`).
- `--health-file <path>` — путь к health-файлу (например `.outbox-health.json`).
- `--print-health` — вывести текущие счетчики и завершиться.
- `--base-url <url>` — базовый URL (по умолчанию `http://localhost:3000`).
- `--secret <token>` — токен outbox (иначе берется из `OUTBOX_CONSUMER_SECRET`).

### Переменные окружения

- `OUTBOX_CONSUMER_SECRET` — обязательный токен для доступа к `/api/outbox/*`.
- `OUTBOX_POLL_INTERVAL` — интервал polling (ms).
- `OUTBOX_PULL_LIMIT` — размер пачки.
- `OUTBOX_MAX_RETRIES` — число ретраев.
- `OUTBOX_CURSOR_FILE` — путь к курсору.
- `OUTBOX_HEALTH_FILE` — путь к health-файлу.

### Примечания

- Файл курсора `.outbox-cursor.json` не должен попадать в git.
- Логи содержат только технические идентификаторы (requestId/eventId), без PII.
- Политика неизвестных событий/отсутствия аккаунта: ack + skip, чтобы очередь не забивалась.
- Воркеры автоматически читают `.env` из корня проекта (если файл есть). PowerShell override остаётся опцией.

## Telegram worker

Воркер для Telegram: принимает `/start` и `/bind CODE`, а также доставляет события из outbox.

### Запуск

```bash
npm run telegram:worker -- --watch --interval 1500
```

Однократный прогон:

```bash
npm run telegram:worker -- --once
```

### Параметры

- `--once` - один цикл inbound/outbound и завершение.
- `--watch` - постоянный polling.
- `--interval <ms>` - интервал outbound polling (по умолчанию 1500).
- `--tg-offset-file <path>` - путь к файлу offset для getUpdates (по умолчанию `.tg-offset.json`).
- `--outbox-cursor-file <path>` - путь к файлу курсора outbox (по умолчанию `.outbox-cursor.json`).
- `--base-url <url>` - базовый URL приложения (по умолчанию `http://localhost:3000`).
- `--token <token>` - токен Telegram бота (иначе `TELEGRAM_BOT_TOKEN`).
- `--secret <token>` - секрет для `/api/telegram/bind/confirm` (иначе `TELEGRAM_BOT_SECRET`).
- `--outbox-secret <token>` - токен outbox (иначе `OUTBOX_CONSUMER_SECRET`).
- `--health-file <path>` - путь для health-файла (например `.worker-health.json`).
- `--print-health` - вывести текущие счетчики и завершиться.

### Переменные окружения

- `TELEGRAM_BOT_TOKEN` - токен Telegram бота (обязательно).
- `TELEGRAM_BOT_SECRET` - секрет для подтверждения `/bind` (обязательно).
- `APP_BASE_URL` - базовый URL приложения (по умолчанию `http://localhost:3000`).
- `TELEGRAM_OFFSET_FILE` - путь к offset файлу (опционально).
- `TELEGRAM_POLL_INTERVAL` - интервал outbound polling (ms).
- `TELEGRAM_LONGPOLL_TIMEOUT` - timeout long-polling (сек).
- `OUTBOX_CONSUMER_SECRET` - токен outbox (обязательно).
- `OUTBOX_PULL_LIMIT` - размер пачки outbox.
- `TELEGRAM_HEALTH_FILE` - путь для health-файла (опционально).

### Примечания

- `.tg-offset.json` и `.outbox-cursor.json` не должны попадать в git.
- В логах не содержится PII, только технические идентификаторы и маскированные chatId.
- Health-файл обновляется при успешном inbound/outbound цикле и содержит таймстампы.
- Политика неизвестных событий/отсутствия аккаунта: ack + skip.
- Воркеры автоматически читают `.env` из корня проекта (если файл есть). PowerShell override остаётся опцией.

## Формат логов (v2)

Все логи — одна JSON-строка на событие.

Пример (HTTP вызов):

```json
{"ts":"2026-01-22T11:10:40.123Z","level":"info","scope":"http","msg":"outbox.pull","requestId":"8b6e...","status":200,"durationMs":87}
```

Пример (outbox событие):

```json
{"ts":"2026-01-22T11:10:41.456Z","level":"info","scope":"outbox","msg":"event.sent","requestId":"8b6e...","eventId":"d2f0...","type":"MESSAGE_SENT","chatId":"12***34","durationMs":42,"attempt":1}
```

## Health-file (v2)

Пример содержимого health-файла:

```json
{
  "ts": "2026-01-22T11:12:00.000Z",
  "scope": "outbox",
  "mode": "watch",
  "lastSuccessAt": "2026-01-22T11:11:59.500Z",
  "lastErrorAt": null,
  "processed": 12,
  "sent": 12,
  "skipped": 2,
  "acked": 14,
  "errors": 0
}
```

## Telegram delivery (6 типов)

Минимальный набор событий и deep links:

1) `MESSAGE_SENT` → `/dashboard/inbox/{conversationId}` (если нет conversationId → `/dashboard/inbox`)
2) `APPLICATION_ACCEPTED` → `/dashboard/inbox/{conversationId}` (fallback `/dashboard/deals`)
3) `INVITATION_SENT` → `/dashboard/invitations`
4) `ESCROW_FUNDED` → `/dashboard/jobs/{jobId}`
5) `SUBMISSION_SUBMITTED` → `/dashboard/jobs/{jobId}/review`
6) `PAYOUT_APPROVED` → `/dashboard/balance`

Политика для неизвестных типов и отсутствия TelegramAccount: ack + skip (чтобы очередь не блокировалась).
