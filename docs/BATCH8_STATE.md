# Batch 8 State (Stability Gate v2)

## Полный прогон (локально)

1) База данных:
```bash
npm run db:up
npm run db:reset
npm run db:deploy
npm run db:seed
```

2) Проверки:
```bash
npm run check
```

3) Dev + smoke:
```bash
npm run dev
```
В другом окне:
```bash
npm run smoke
```

4) Workers:
```bash
OUTBOX_CONSUMER_SECRET=... npm run outbox:worker -- --once
TELEGRAM_BOT_TOKEN=... TELEGRAM_BOT_SECRET=... OUTBOX_CONSUMER_SECRET=... npm run telegram:worker -- --watch
```

## Что проходит
- `npm run lint` — OK.
- `npm run typecheck` — OK.

## Что не проходит
- `npm run db:reset` — FAIL: Postgres недоступен на `localhost:5432` (Docker Desktop не запущен).
  - Ошибка: `Postgres не доступен на localhost:5432.` / `dockerDesktopLinuxEngine: The system cannot find the file specified.`

## P0 блокеры
- Docker Desktop/ Postgres не запущен → невозможно выполнить `db:reset/db:deploy/db:seed`, smoke и workers.

## Примечания
- Workers (`outbox`/`telegram`) теперь делают preflight `/api/health` и сообщают, если dev-сервер не запущен.
- Добавлен health endpoint: `/api/health`.
- Локально ранее фиксировалась ошибка `EPERM` при Prisma generate на Windows (лечится закрытием процессов и повтором).
- Telegram binding (status/attempts): если видите `column TelegramBindingRequest.status does not exist`, значит не применена миграция `20260115233000_telegram_binding_status_attempts`. Решение: `npm run db:deploy` (или `npm run db:reset` для dev).

## Notification coverage (audit)

| Action | Recipient | Notification type | Route |
| --- | --- | --- | --- |
| Invite creator | Creator | INVITATION_SENT | `src/app/api/invitations/route.ts` |
| Invite accepted | Brand | INVITATION_ACCEPTED | `src/app/api/invitations/[id]/accept/route.ts` |
| Invite declined | Brand | INVITATION_DECLINED | `src/app/api/invitations/[id]/decline/route.ts` |
| Application created | Brand | APPLICATION_CREATED | `src/app/api/jobs/[id]/apply/route.ts` |
| Application accepted | Creator | APPLICATION_ACCEPTED | `src/app/api/jobs/[id]/applications/[applicationId]/accept/route.ts` |
| Application rejected | Creator | APPLICATION_REJECTED | `src/app/api/jobs/[id]/applications/[applicationId]/reject/route.ts` |
| Application withdrawn | Brand | APPLICATION_WITHDRAWN | `src/app/api/applications/[id]/withdraw/route.ts` |
| Submission submitted | Brand | SUBMISSION_SUBMITTED | `src/app/api/jobs/[id]/submissions/route.ts` |
| Review approved (job completed) | Creator | JOB_COMPLETED | `src/app/api/jobs/[id]/review/approve/route.ts` |
| Escrow funded | Creator | ESCROW_FUNDED | `src/app/api/escrow/[jobId]/fund/route.ts` |
| Payout requested | Admins | PAYOUT_REQUESTED | `src/app/api/payouts/request/route.ts` |
| Payout approved | Creator | PAYOUT_APPROVED | `src/app/api/admin/payouts/[id]/approve/route.ts` |
| Payout rejected | Creator | PAYOUT_REJECTED | `src/app/api/admin/payouts/[id]/reject/route.ts` |
