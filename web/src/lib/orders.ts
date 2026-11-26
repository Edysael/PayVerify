export type OrderStatus = "pending" | "paid_probable" | "paid_confirmed" | "needs_review" | "expired" | "cancelled";

export type OrderRow = {
  id: string;
  external_ref: string;
  description: string | null;
  amount: number;
  currency: "VES";
  status: OrderStatus;
  expires_at: string;
  created_at: string;
  match_method: string | null;
  matched_payment_event_id: string | null;
  customer_phone_last4: string | null;
  expected_reference_tail: string | null;
};

export type UnmatchedPayment = {
  id: string;
  amount: number;
  reference: string;
  transaction_date: string;
  origin_phone_last4: string | null;
  origin_bank_code: string | null;
  capture_channel: string;
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Esperando pago",
  paid_probable: "Pago detectado",
  paid_confirmed: "Confirmado con extracto",
  needs_review: "Requiere tu revisión",
  expired: "Vencida",
  cancelled: "Cancelada",
};

export const MATCH_METHOD_LABELS: Record<string, string> = {
  reference: "monto + referencia",
  amount_phone: "monto + teléfono",
  amount_only: "solo monto (revisar)",
  manual_approved: "aprobado manualmente",
  manual_link: "vinculado manualmente",
};

/** An order whose time ran out is shown as expired even before the scheduled job updates it. */
export function effectiveStatus(o: Pick<OrderRow, "status" | "expires_at">, now = Date.now()): OrderStatus {
  return o.status === "pending" && new Date(o.expires_at).getTime() < now ? "expired" : o.status;
}

/** Payments still unlinked whose amount equals the order amount (candidates for a manual link). */
export function candidatePayments(order: Pick<OrderRow, "amount">, payments: UnmatchedPayment[]): UnmatchedPayment[] {
  return payments.filter((p) => Number(p.amount) === Number(order.amount));
}
