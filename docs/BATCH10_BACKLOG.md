# Batch 10 Backlog (as of Jan 23, 2026)

## P0 — блокеры прод‑готовности
1) **Smoke/seed стабилизация в CI**  
   Где: `.github/workflows/ci.yml`, `scripts/smoke.ts`  
   Готовность: CI стабильно проходит build+start+smoke без флаков (health wait, DB preflight).
2) **Payments invariants audit (ретраи/идемпотентность)**  
   Где: `src/lib/payments/*`, `src/app/api/*`  
   Готовность: повторные fund/release/approve не дают двойных ledger entries, 409/CONFLICT стабильны.
3) **AuthZ sweep**  
   Где: `src/app/api/**/route.ts`, `src/lib/authz.ts`  
   Готовность: нет blind update/delete без ownership, negative‑smoke покрывает 404/403.

## P1 — качество и DX
1) **Notifications coverage audit**  
   Где: routes приглашений/откликов/сдач/выплат, `src/lib/notifications.ts`  
   Готовность: ключевые события создают Notification, smoke проверяет INVITATION_SENT + JOB_COMPLETED.
2) **Worker health/observability v2**  
   Где: `scripts/outbox-consumer.ts`, `scripts/telegram-worker.ts`  
   Готовность: health‑file + counters, единый JSON‑лог формат, no‑PII.
3) **Performance evidence**  
   Где: inbox/notifications/admin lists  
   Готовность: PRISMA_QUERY_LOG подтверждает отсутствие N+1 и корректные индексы.
4) **Payments audit follow‑ups**  
   Где: `docs/B10_PAYMENTS_AUDIT.md`, `src/lib/payments/*`, payment routes  
   Готовность: устранены риски из аудита, инварианты проверены ретраями.

## P2 — полировка
1) **UX/тексты хвосты**  
   Где: public/dash/admin copy  
   Готовность: нет англ. слов в UI, единые статусы/лейблы.
2) **Docs cleanup**  
   Где: `docs/*`  
   Готовность: актуальные state/backlog файлы, один источник правды.
