import { adminClient, cors, isUuid, out, resolveCaller } from "../_shared/auth.ts";

// The customer reports the reference tail / phone after paying. Re-evaluates the match.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out(405, { error: "method_not_allowed" });
  const ctx = adminClient();
  if (!ctx) return out(503, { error: "server_not_configured" });
  let b: any;
  try { b = await req.json(); } catch { return out(400, { error: "invalid_json" }); }
  if (!b || typeof b !== "object" || Array.isArray(b)) return out(400, { error: "invalid_json" });
  const caller = await resolveCaller(req, ctx, b?.organizationId);
  if (caller instanceof Response) return caller;
  if (typeof b.externalRef !== "string" || !/^[\w./-]{1,64}$/.test(b.externalRef)) return out(400, { error: "invalid_external_ref" });
  const { data: order } = await ctx.admin.from("payverify_orders").select("id")
    .eq("organization_id", caller.orgId).eq("external_ref", b.externalRef).maybeSingle();
  if (!order) return out(404, { error: "order_not_found" });
  const { data, error } = await ctx.admin.rpc("payverify_order_set_hints", {
    p_order_id: order.id, p_phone_last4: b.customerPhoneLast4 ?? null, p_reference_tail: b.referenceTail ?? null,
  });
  if (error) {
    const known = ["invalid_reference_tail", "invalid_phone", "invalid_state"];
    const code = known.find((k) => error.message?.includes(k));
    return out(code === "invalid_state" ? 409 : code ? 400 : 500, { error: code ?? "order_update_failed" });
  }
  return out(200, { orderId: data.id, status: data.status, matchMethod: data.match_method });
});
