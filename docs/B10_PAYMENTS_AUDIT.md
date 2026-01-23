# Payments Idempotency Audit (Batch 10) — as of Jan 23, 2026

## Flows (entrypoints)
1) **Fund escrow (brand)**  
   - Route: `src/app/api/escrow/[jobId]/fund/route.ts`
2) **Accept application (brand → escrow created)**  
   - Route: `src/app/api/jobs/[id]/applications/[applicationId]/accept/route.ts`
3) **Approve submission / release escrow**  
   - Route: `src/app/api/jobs/[id]/review/approve/route.ts`  
   - Core: `src/lib/payments/escrow.ts` (`releaseEscrowForJob`)
4) **Payout request (creator)**  
   - Route: `src/app/api/payouts/request/route.ts`
5) **Payout approve / reject (admin)**  
   - Routes: `src/app/api/admin/payouts/[id]/approve/route.ts`, `.../reject/route.ts`
6) **Cancel payout (creator)**  
   - Route: `src/app/api/payouts/[id]/cancel/route.ts`
7) **Dispute release/refund (admin)**  
   - Routes: `src/app/api/admin/disputes/[id]/resolve-release/route.ts`, `.../resolve-refund/route.ts`

## Idempotency mechanisms (where enforced)
- **Ledger references** (unique): `src/lib/payments/references.ts`  
  - `ESCROW_FUND:<escrowId>`  
  - `ESCROW_RELEASE:<escrowId>`  
  - `ESCROW_REFUND:<escrowId>`  
  - `ESCROW_COMMISSION:<escrowId>`  
  - `PAYOUT_REQUEST:<payoutId>`  
  - `PAYOUT_APPROVE:<payoutId>`  
  - `PAYOUT_REJECT:<payoutId>`  
  - `PAYOUT_CANCEL:<payoutId>`  
  - `FINANCE_ADJUST:<requestId>`
- **Conditional updates**  
  - `updateMany(where: { id, status: EXPECTED })` used in escrow fund, payout approve, escrow release/refund.  
  - Prevents double transitions under retries.
- **Duplicate ledger handling**  
  - `P2002` mapped to `409 CONFLICT` (e.g., escrow fund, payout approve/reject/cancel).
- **Existing ledger check**  
  - `releaseEscrowForJob` / `refundEscrowForJob` check existing ledger by reference before transition.

## Invariants (expected)
1) Escrow state machine: `UNFUNDED → FUNDED → RELEASED` (or `REFUNDED` via cancel/dispute).  
2) **Single ledger entry per operation** (unique `reference`).  
3) Escrow release only if `status=FUNDED` and job has `activeCreatorId`.  
4) Refund only if `status=FUNDED` and not already `RELEASED/REFUNDED`.  
5) Payout request only if wallet balance ≥ amount and **no pending payout** exists.  
6) Payout approve/reject only if payout status is `PENDING`.  
7) Retrying fund/approve/release should be idempotent: no double ledger or double balance change.  
8) Admin finance adjustments are idempotent by requestId reference.

## Risk hotspots (needs periodic review)
1) **Escrow fund**: `src/app/api/escrow/[jobId]/fund/route.ts`  
   - Risk: concurrent fund calls; relies on `updateMany` + ledger unique.  
2) **Release escrow**: `src/lib/payments/escrow.ts` → `releaseEscrowForJob`  
   - Risk: double release if state check/ledger create race; mitigated by ref + updateMany.  
3) **Refund escrow**: `src/lib/payments/escrow.ts` → `refundEscrowForJob`  
   - Risk: refund vs release race; relies on status checks and ledger ref.  
4) **Payout request**: `src/app/api/payouts/request/route.ts`  
   - Risk: race on wallet decrement; relies on `updateMany` balance check + pending payout check.  
5) **Admin approve payout**: `src/app/api/admin/payouts/[id]/approve/route.ts`  
   - Risk: double approve; relies on `updateMany` + ledger unique.
6) **Cancel payout**: `src/app/api/payouts/[id]/cancel/route.ts`  
   - Risk: refunding balance twice; relies on payout status + ledger ref.

## Notes
- Smoke covers: fund idempotency, approve idempotency, payout approve idempotency.  
- Batch 10 P0 candidates: audit concurrency edge cases (race between release/refund/cancel) and cross‑endpoint retries.

