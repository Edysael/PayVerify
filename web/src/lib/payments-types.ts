export type PaymentStatus =
  | "SMS_DETECTED" | "DATA_EXTRACTED" | "RECEIVED_BY_SERVER"
  | "PENDING_REVIEW" | "RECONCILED" | "POSSIBLE_DUPLICATE"
  | "PARSING_ERROR" | "REJECTED";

export type PaymentRow = {
  id: string;
  amount: number;
  currency: "VES";
  reference: string;
  transaction_date: string;
  verification_status: PaymentStatus;
  source_type: "sms" | "manual" | "statement";
  event_time_source?: "sms_received" | "bank_statement" | "manual" | "unknown";
  created_at: string;
};

export type PaymentFilters = {
  status?: PaymentStatus | "all";
  from?: string;
  to?: string;
  reference?: string;
  minAmount?: number;
  maxAmount?: number;
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  SMS_DETECTED: "SMS detectado",
  DATA_EXTRACTED: "Datos extraídos",
  RECEIVED_BY_SERVER: "Recibido por servidor",
  PENDING_REVIEW: "Pendiente de revisión",
  RECONCILED: "Conciliado",
  POSSIBLE_DUPLICATE: "Posible duplicado",
  PARSING_ERROR: "Error de lectura",
  REJECTED: "Rechazado",
};
