import type { PaymentStatus } from '../lib/payment-status';
import { paymentStatusLabel } from '../lib/payment-status';

export function StatusPill({ status }: { status: PaymentStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}>{paymentStatusLabel[status]}</span>;
}
