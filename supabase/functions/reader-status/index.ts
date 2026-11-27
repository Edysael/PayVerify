import { adminClient, cors, out, resolveCaller } from "../_shared/auth.ts";

// ¿Hay un teléfono lector escuchando pagos ahora? Lo usa el checkout (API key) antes de crear una orden.
// "En línea" = dispositivo aprobado, con la captura activada y un latido en los últimos ONLINE_MS.
const ONLINE_MS = 5 * 60 * 1000;
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out(405, { error: "method_not_allowed" });
  const ctx = adminClient();
  if (!ctx) return out(503, { error: "server_not_configured" });
  let b: any;
  try { b = await req.json(); } catch { return out(400, { error: "invalid_json" }); }
  if (!b || typeof b !== "object" || Array.isArray(b)) return out(400, { error: "invalid_json" });
  const caller = await resolveCaller(req, ctx, b?.organizationId, ["owner", "admin", "operator", "viewer"]);
  if (caller instanceof Response) return caller;
  const { data, error } = await ctx.admin.from("pv_devices")
    .select("device_name,capture_active,last_heartbeat_at")
    .eq("organization_id", caller.orgId).eq("device_status", "active")
    .order("last_heartbeat_at", { ascending: false, nullsFirst: false }).limit(20);
  if (error) return out(500, { error: "reader_status_failed" });
  const now = Date.now();
  const devices = (data ?? []).map((d) => {
    const last = d.last_heartbeat_at ? new Date(d.last_heartbeat_at).getTime() : 0;
    const connected = last > 0 && now - last <= ONLINE_MS;
    return { name: d.device_name, online: connected && d.capture_active === true, connected, captureActive: d.capture_active === true, lastHeartbeatAt: d.last_heartbeat_at };
  });
  const online = devices.filter((d) => d.online).length;
  const reason = online > 0 ? null : devices.length === 0 ? "no_devices" : devices.some((d) => d.connected) ? "capture_paused" : "no_recent_heartbeat";
  return out(200, { online: online > 0, onlineDevices: online, totalDevices: devices.length, reason, lastHeartbeatAt: devices[0]?.lastHeartbeatAt ?? null, devices });
});
