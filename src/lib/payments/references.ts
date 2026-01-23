export const ledgerReference = {
  escrowFund: (escrowId: string) => `ESCROW_FUND:${escrowId}`,
  escrowRelease: (escrowId: string) => `ESCROW_RELEASE:${escrowId}`,
  escrowRefund: (escrowId: string) => `ESCROW_REFUND:${escrowId}`,
  escrowCommission: (escrowId: string) => `ESCROW_COMMISSION:${escrowId}`,
  payoutRequest: (payoutId: string) => `PAYOUT_REQUEST:${payoutId}`,
  payoutApprove: (payoutId: string) => `PAYOUT_APPROVE:${payoutId}`,
  payoutReject: (payoutId: string) => `PAYOUT_REJECT:${payoutId}`,
  payoutCancel: (payoutId: string) => `PAYOUT_CANCEL:${payoutId}`,
  financeAdjust: (requestId: string) => `FINANCE_ADJUST:${requestId}`,
};
