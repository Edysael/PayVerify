import { describe, expect, it } from "vitest";
import { paymentsToCsv } from "./csv-export";
import type { PaymentRow } from "./payments-types";

const sample: PaymentRow = {
  id: "evt-1", amount: 12.5, currency: "VES", reference: '=CMD("x")',
  transaction_date: "2026-01-01T12:00:00Z", verification_status: "SMS_DETECTED",
  source_type: "sms", created_at: "2026-01-01T12:00:00Z",
};
describe("paymentsToCsv", () => {
  it("escapes quotes and neutralizes formula injection", () => {
    const csv = paymentsToCsv([sample]);
    expect(csv).toContain(`"'=CMD(""x"")"`);
    expect(csv).toContain("verification_status");
  });
});
