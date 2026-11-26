export type StatementLine = {
  amountMinorUnits: number;
  currency: string;
  reference?: string | null;
  transactionTimeMillis: number;
  fingerprint: string;
};

export type PaymentCandidate = {
  id: string;
  amountMinorUnits: number;
  currency: string;
  reference: string;
  transactionTimeMillis: number;
};

export type CandidateResult = {
  lineFingerprint: string;
  candidatePaymentIds: string[];
  decision: "none" | "single_candidate" | "ambiguous";
};

/**
 * Conservative candidate finder. It never marks a payment reconciled.
 * A caller must require explicit, authorized human confirmation.
 */
export function findReconciliationCandidates(
  line: StatementLine,
  payments: PaymentCandidate[],
  toleranceMillis = 48 * 60 * 60 * 1000,
): CandidateResult {
  if (!Number.isFinite(line.amountMinorUnits) || line.amountMinorUnits <= 0) {
    return { lineFingerprint: line.fingerprint, candidatePaymentIds: [], decision: "none" };
  }
  if (!/^[A-Z]{3}$/.test(line.currency) || toleranceMillis < 0) {
    return { lineFingerprint: line.fingerprint, candidatePaymentIds: [], decision: "none" };
  }

  const ref = (line.reference ?? "").trim().toUpperCase();
  if (!ref) {
    return { lineFingerprint: line.fingerprint, candidatePaymentIds: [], decision: "none" };
  }

  const candidates = payments.filter((payment) =>
    payment.currency === line.currency &&
    payment.amountMinorUnits === line.amountMinorUnits &&
    payment.reference.trim().toUpperCase() === ref &&
    Math.abs(payment.transactionTimeMillis - line.transactionTimeMillis) <= toleranceMillis
  );

  const ids = candidates.map((item) => item.id);
  return {
    lineFingerprint: line.fingerprint,
    candidatePaymentIds: ids,
    decision: ids.length === 0 ? "none" : ids.length === 1 ? "single_candidate" : "ambiguous",
  };
}
