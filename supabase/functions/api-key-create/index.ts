import { adminClient, cors, isUuid, out, resolveCaller, sha256Hex } from "../_shared/auth.ts";

// Owner/admin creates an API key for the merchant's checkout. The key is shown ONCE; only its hash is stored.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out(405, { error: "method_not_allowed" });
  const ctx = adminClient();
  if (!ctx) return out(503, { error: "server_not_configured" });
  if (req.headers.get("x-payverify-key")) return out(403, { error: "session_required" });
  let b: any;
  try { b = await req.json(); } catch { return out(400, { error: "invalid_json" }); }
  const caller = await resolveCaller(req, ctx, b?.organizationId, ["owner", "admin"]);
  if (caller instanceof Response) return caller;
  const revokeId = b.revokeKeyId;
  if (revokeId !== undefined) {
    if (!isUuid(revokeId)) return out(400, { error: "invalid_key_id" });
    const { error } = await ctx.admin.from("payverify_api_keys").update({ revoked_at: new Date().toISOString() })
      .eq("id", revokeId).eq("organization_id", caller.orgId).is("revoked_at", null);
    if (error) return out(500, { error: "revoke_failed" });
    await ctx.admin.from("pv_audit_logs").insert({ organization_id: caller.orgId, user_id: caller.userId, action: "api_key_revoked", entity_type: "api_key", entity_id: revokeId });
    return out(200, { ok: true });
  }
  if (typeof b.label !== "string" || b.label.trim().length < 1 || b.label.length > 80) return out(400, { error: "invalid_label" });
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const key = "pvk_" + Array.from(raw, (x) => x.toString(16).padStart(2, "0")).join("");
  const { data, error } = await ctx.admin.from("payverify_api_keys")
    .insert({ organization_id: caller.orgId, label: b.label.trim(), key_hash: await sha256Hex(key), created_by: caller.userId })
    .select("id").maybeSingle();
  if (error || !data) return out(500, { error: "key_create_failed" });
  await ctx.admin.from("pv_audit_logs").insert({ organization_id: caller.orgId, user_id: caller.userId, action: "api_key_created", entity_type: "api_key", entity_id: data.id });
  return out(201, { keyId: data.id, apiKey: key, note: "Guárdala ahora: no se vuelve a mostrar." });
});
