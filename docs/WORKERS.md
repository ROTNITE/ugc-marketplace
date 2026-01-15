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
- `--base-url <url>` — базовый URL (по умолчанию `http://localhost:3000`).
- `--secret <token>` — токен outbox (иначе берется из `OUTBOX_CONSUMER_SECRET`).

### Переменные окружения

- `OUTBOX_CONSUMER_SECRET` — обязательный токен для доступа к `/api/outbox/*`.
- `OUTBOX_POLL_INTERVAL` — интервал polling (ms).
- `OUTBOX_PULL_LIMIT` — размер пачки.
- `OUTBOX_MAX_RETRIES` — число ретраев.
- `OUTBOX_CURSOR_FILE` — путь к курсору.

### Примечания

- Файл курсора `.outbox-cursor.json` не должен попадать в git.
- Логи содержат только технические идентификаторы (requestId/eventId), без PII.

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

### Переменные окружения

- `TELEGRAM_BOT_TOKEN` - токен Telegram бота (обязательно).
- `TELEGRAM_BOT_SECRET` - секрет для подтверждения `/bind` (обязательно).
- `APP_BASE_URL` - базовый URL приложения (по умолчанию `http://localhost:3000`).
- `TELEGRAM_OFFSET_FILE` - путь к offset файлу (опционально).
- `TELEGRAM_POLL_INTERVAL` - интервал outbound polling (ms).
- `TELEGRAM_LONGPOLL_TIMEOUT` - timeout long-polling (сек).
- `OUTBOX_CONSUMER_SECRET` - токен outbox (обязательно).
- `OUTBOX_PULL_LIMIT` - размер пачки outbox.

### Примечания

- `.tg-offset.json` и `.outbox-cursor.json` не должны попадать в git.
- В логах не содержится PII, только технические идентификаторы и маскированные chatId.
