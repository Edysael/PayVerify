export type PaymentStatus =
  | 'SMS_DETECTED'
  | 'DATA_EXTRACTED'
  | 'RECEIVED_BY_SERVER'
  | 'PENDING_REVIEW'
  | 'RECONCILED'
  | 'POSSIBLE_DUPLICATE'
  | 'PARSING_ERROR'
  | 'REJECTED';

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  SMS_DETECTED: 'SMS detectado',
  DATA_EXTRACTED: 'Datos extraídos',
  RECEIVED_BY_SERVER: 'Recibido por servidor',
  PENDING_REVIEW: 'Pendiente de revisión',
  RECONCILED: 'Conciliado',
  POSSIBLE_DUPLICATE: 'Posible duplicado',
  PARSING_ERROR: 'Error de lectura',
  REJECTED: 'Rechazado',
};
