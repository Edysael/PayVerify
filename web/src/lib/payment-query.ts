import type { PaymentFilters } from "./payments-types";

export function applyPaymentFilters<T extends {
  gte: (column: string, value: string) => T;
  lte: (column: string, value: string) => T;
  eq: (column: string, value: string) => T;
  ilike: (column: string, pattern: string) => T;
  gteAmount: (value: number) => T;
  lteAmount: (value: number) => T;
}>(query: T, filters: PaymentFilters): T {
  let q = query;
  if (filters.status && filters.status !== "all") q = q.eq("verification_status", filters.status);
  if (filters.from) q = q.gte("transaction_date", new Date(filters.from).toISOString());
  if (filters.to) q = q.lte("transaction_date", new Date(filters.to + "T23:59:59.999Z").toISOString());
  if (filters.reference?.trim()) q = q.ilike("reference", `%${filters.reference.trim().replace(/[%_]/g, "\\$&")}%`);
  if (filters.minAmount != null) q = q.gteAmount(filters.minAmount);
  if (filters.maxAmount != null) q = q.lteAmount(filters.maxAmount);
  return q;
}
