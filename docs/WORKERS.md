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
