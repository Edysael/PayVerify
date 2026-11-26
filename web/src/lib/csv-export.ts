import type { PaymentRow } from "./payments-types";

function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  // Neutralize spreadsheet formula injection for cells beginning with formula chars.
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
export function paymentsToCsv(rows: PaymentRow[]): string {
  const columns: (keyof PaymentRow)[] = [
    "id", "amount", "currency", "reference", "transaction_date",
    "verification_status", "source_type", "created_at",
  ];
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(",")),
  ].join("\r\n");
}
export function downloadPaymentsCsv(rows: PaymentRow[], filename = "payverify-pagos.csv") {
  if (typeof window === "undefined") return;
  const blob = new Blob(["\uFEFF", paymentsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
