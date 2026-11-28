// Estado del teléfono lector a partir del latido (misma regla que la función reader-status: 5 minutos).
export const ONLINE_MS = 5 * 60 * 1000;

export type ReaderInput = { device_status: string; last_heartbeat_at?: string | null; capture_active?: boolean };
export type ReaderState = { label: string; tone: "green" | "amber" | "red" | "gray" };

export function readerState(d: ReaderInput, now: Date): ReaderState {
  if (d.device_status === "pending") return { label: "Espera aprobación", tone: "amber" };
  if (d.device_status !== "active") return { label: "—", tone: "gray" };
  if (d.last_heartbeat_at === undefined) return { label: "Sin datos", tone: "gray" }; // migración 0013 aún no aplicada
  const last = d.last_heartbeat_at ? new Date(d.last_heartbeat_at).getTime() : 0;
  const recent = last > 0 && now.getTime() - last <= ONLINE_MS;
  if (recent && d.capture_active) return { label: "🟢 Recibiendo", tone: "green" };
  if (recent) return { label: "Pausado", tone: "amber" };
  return { label: last ? "🔴 Sin conexión" : "Nunca conectado", tone: "red" };
}
