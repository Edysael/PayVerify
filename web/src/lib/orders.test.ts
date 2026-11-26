import { describe, expect, it } from "vitest";
import { candidatePayments, effectiveStatus } from "./orders";

describe("orders helpers", () => {
  it("shows pending orders past their deadline as expired", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(effectiveStatus({ status: "pending", expires_at: past })).toBe("expired");
  });
  it("keeps paid orders paid even if the deadline passed", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(effectiveStatus({ status: "paid_probable", expires_at: past })).toBe("paid_probable");
  });
  it("only offers payments with exactly the same amount", () => {
    const pays = [
      { id: "a", amount: 10, reference: "1", transaction_date: "", origin_phone_last4: null, origin_bank_code: null, capture_channel: "sms" },
      { id: "b", amount: 10.01, reference: "2", transaction_date: "", origin_phone_last4: null, origin_bank_code: null, capture_channel: "sms" },
    ];
    expect(candidatePayments({ amount: 10 }, pays).map((p) => p.id)).toEqual(["a"]);
  });
});
