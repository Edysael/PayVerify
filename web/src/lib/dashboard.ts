// Cálculos del tablero (puros, sin Supabase) para poder probarlos con vitest.

export const RANGE_OPTIONS = [7, 14, 30] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

export function parseRange(value: string | string[] | undefined): RangeDays {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (RANGE_OPTIONS as readonly number[]).includes(n) ? (n as RangeDays) : 14;
}

/** Día calendario (aaaa-mm-dd) en la zona dada. */
export function dayKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export type TrendPoint = { key: string; label: string; registered: number; reconciled: number };

/**
 * Agrupa pagos por día para los últimos `days` días (incluido hoy).
 * "Conciliados" cuenta los pagos de ese día que hoy están en estado RECONCILED.
 */
export function buildTrend(
  payments: { transaction_date: string; verification_status: string }[],
  days: number, now: Date, timeZone: string,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  const index = new Map<string, TrendPoint>();
  const label = new Intl.DateTimeFormat("es-CL", { timeZone, day: "numeric", month: "short" });
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = dayKey(d, timeZone);
    if (index.has(key)) continue;
    const p = { key, label: label.format(d).replace(".", ""), registered: 0, reconciled: 0 };
    index.set(key, p); points.push(p);
  }
  for (const pay of payments) {
    const d = new Date(pay.transaction_date);
    if (Number.isNaN(d.getTime())) continue;
    const p = index.get(dayKey(d, timeZone));
    if (!p) continue;
    p.registered++;
    if (pay.verification_status === "RECONCILED") p.reconciled++;
  }
  return points;
}

/** Variación porcentual entre dos periodos; null si no hay base para comparar. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function share(part: number, total: number): number | null {
  return total > 0 ? (part / total) * 100 : null;
}

const pct = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export function formatPercent(value: number, signed = false): string {
  const s = pct.format(Math.abs(value)) + "%";
  if (!signed) return (value < 0 ? "-" : "") + s;
  return (value > 0 ? "+" : value < 0 ? "-" : "") + s;
}

const int = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });
export function formatInt(n: number): string { return int.format(n); }

export function timeAgo(iso: string, now: Date): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((now.getTime() - t) / 1000));
  if (s < 60) return "Hace un momento";
  const m = Math.round(s / 60);
  if (m < 60) return `Hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "Hace 1 día" : `Hace ${d} días`;
}

/** Máximo "redondo" para el eje Y y sus marcas. */
export function niceScale(max: number, ticks = 8): { max: number; step: number } {
  if (max <= 0) return { max: ticks - 1, step: 1 };
  const raw = max / (ticks - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? 10 * mag;
  const niceStep = step < 1 ? 1 : step;
  return { max: Math.ceil(max / niceStep) * niceStep, step: niceStep };
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] ?? "")).toUpperCase();
}

export const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario", admin: "Administrador", operator: "Operador", viewer: "Lector",
};
