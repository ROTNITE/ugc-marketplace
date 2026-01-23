# Batch 9 Backlog

## 1) План Batch 8 vs факт (кратко)
- Планировали: стабилизацию ядра (smoke/CI/health), contract/observability, Telegram delivery по 5 типам событий, покрытие уведомлений.
- Факт (по BATCH8_STATE + правкам):
  - Smoke расширен (негативные контрактные кейсы + инвайты/уведомления).
  - Workers: preflight, health, структурные логи, автоподхват `.env`.
  - Telegram delivery: 5 типов с шаблонами и deep-links, политика ack/skip.
  - CI health endpoint есть; CI стабильнее (wait увеличен, start prod-mode).
  - Notification coverage расширена (инвайты/withdraw/approve).
  - Осталось: добить 100% contract coverage для write routes, финализировать payments idempotency/unique reference, закрыть stale session на всех write, perf evidence по реальным логам, стабилизировать CI + admin blockers (если ещё не доведено на всех окружениях).

## 2) P0 — блокеры прод-готовности

**B9-P0-01: 100% API contract coverage (write routes)**
- Что: все POST/PUT/PATCH/DELETE строго `{ ok, data } / { ok:false, error }` с requestId.
- Где: `src/app/api/**/route.ts`, `src/lib/api/contract.ts`, `src/lib/api/errors.ts`, `scripts/smoke.ts`.
- Готово когда: `rg` не находит сырой формат ответов; smoke ловит VALIDATION_ERROR.

**B9-P0-02: Stale session guard повсеместно**
- Что: DB-backed requireUser; при «битой сессии» — 401/SESSION_INVALID, без P2003.
- Где: `src/lib/auth.ts`, `src/lib/authz.ts`, write routes (особенно telegram binding, payments).
- Готово когда: после `db:reset` write‑операции не дают 500.

**B9-P0-03: Payments invariants финал**
- Что: unique `LedgerEntry.reference` в БД + детерминированный reference + safe updateMany.
- Где: `prisma/schema.prisma`, `src/lib/payments/*`, payment routes, `scripts/smoke.ts`.
- Готово когда: повтор fund/release/approve/payout не увеличивает ledger.

**B9-P0-04: CI hardening v2**
- Что: build+start (не dev), wait-for `/api/health`, smoke без бизнес-retry.
- Где: `.github/workflows/ci.yml`, `src/app/api/health/route.ts`, `scripts/smoke.ts`.
- Готово когда: CI не флаки, ошибки всегда с requestId.

**B9-P0-05: Telegram binding миграции без drift**
- Что: status/attempts/expiresAt оформлены миграцией, `db:deploy` чистый.
- Где: `prisma/migrations/*`, `schema.prisma`, `docs/BATCH8_STATE.md`.
- Готово когда: ошибка «column does not exist» невозможна.

## 3) P1 — следующий слой ценности (без редизайна)

**B9-P1-01: Perf evidence + индексы по факту логов**
- Что: включить `PRISMA_QUERY_LOG=1`, снять топ‑запросы, добавить только нужные индексы.
- Где: `src/lib/prisma.ts`, list routes, `prisma/schema.prisma`.
- Готово когда: есть до/после в `docs/BATCH8_STATE.md`.

**B9-P1-02: Notifications coverage audit (закрепить регрессии)**
- Что: таблица «action → recipient → type», закрыть пустые кейсы.
- Где: write routes + `scripts/smoke.ts` (2 регрессии).
- Готово когда: инвайты/апрувы/выплаты дают нотификации стабильно.

**B9-P1-03: Workers robustness v2**
- Что: health-file, counters, единая политика unknown events, backoff caps.
- Где: `scripts/outbox-consumer.ts`, `scripts/telegram-worker.ts`, `docs/WORKERS.md`.
- Готово когда: воркеры не падают на missing account/unknown type.

**B9-P1-04: Minimal integration tests**
- Что: 2–3 не‑UI теста поверх smoke (payments/authz).
- Где: `scripts/smoke.ts` или отдельный `scripts/it-*.ts`.
- Готово когда: тесты воспроизводимы в CI.

## 4) P2 — polish

**B9-P2-01: Observability v2 (requestId end‑to‑end)**
- Что: requestId в outbox payload/meta, единый structured logger в API/воркерах.
- Где: `src/lib/api/contract.ts`, `src/lib/outbox.ts`, `scripts/*`.

**B9-P2-02: Локализация/терминология хвостов**
- Что: убрать оставшиеся англ. строки/сырой enum в UI.
- Где: `src/app/**`, `src/components/**`, `src/lib/status-badges.ts`.

## 5) Epic: Global Redesign (план, не выполнять сейчас)

**B9-EPIC-REDESIGN: Global Redesign**
- Цель: единая дизайн‑система + mobile‑first, разные режимы для креаторов и брендов.
- Этапы:
  1) Research: аудит боли/IA, сценарии “creator‑teen” и “brand‑pro”.
  2) IA: навигация/терминология/флоу сделок.
  3) Design system: токены/типографика/компоненты.
  4) Migration по зонам: Public → Dashboard → Admin.
- Критерии старта редизайна:
  - CI зелёный, smoke зелёный.
  - Payments инварианты закрыты.
  - Telegram delivery стабильна.

## 6) Release checklist (Batch 9)
- `npm run db:deploy` без drift.
- `npm run smoke` зелёный локально и в CI.
- Payments ретраи не дублируют ledger.
- Workers живы, health работает, нет PII в логах.

---
Готово для прямого переноса в «Пачку 9».
