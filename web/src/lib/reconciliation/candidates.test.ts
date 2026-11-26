import { describe, expect, it } from "vitest";
import { findReconciliationCandidates } from "./candidates";

const payment = {
  id: "pay-1",
  amountMinorUnits: 12500,
  currency: "VES",
  reference: "REF-778",
  transactionTimeMillis: 1_700_000_000_000,
};

describe("findReconciliationCandidates", () => {
  it("returns one candidate for exact structured match", () => {
    const result = findReconciliationCandidates({
      amountMinorUnits: 12500,
      currency: "VES",
      reference: " ref-778 ",
      transactionTimeMillis: 1_700_000_000_000,
      fingerprint: "a".repeat(64),
    }, [payment]);
    expect(result.decision).toBe("single_candidate");
    expect(result.candidatePaymentIds).toEqual(["pay-1"]);
  });

  it("does not match without a reference", () => {
    const result = findReconciliationCandidates({
      amountMinorUnits: 12500,
      currency: "VES",
      reference: "",
      transactionTimeMillis: 1_700_000_000_000,
      fingerprint: "b".repeat(64),
    }, [payment]);
    expect(result.decision).toBe("none");
  });

  it("does not propose outgoing negative statement lines", () => {
    const result = findReconciliationCandidates({
      amountMinorUnits: -12500,
      currency: "VES",
      reference: "REF-778",
      transactionTimeMillis: 1_700_000_000_000,
      fingerprint: "d".repeat(64),
    }, [payment]);
    expect(result.decision).toBe("none");
  });

  it("marks multiple candidates ambiguous", () => {
    const result = findReconciliationCandidates({
      amountMinorUnits: 12500,
      currency: "VES",
      reference: "REF-778",
      transactionTimeMillis: 1_700_000_000_000,
      fingerprint: "c".repeat(64),
    }, [payment, { ...payment, id: "pay-2" }]);
    expect(result.decision).toBe("ambiguous");
  });
});
