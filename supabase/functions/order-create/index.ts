import { adminClient, cors, isUuid, out, resolveCaller } from "../_shared/auth.ts";

// Creates an order from the merchant's checkout. Idempotent on externalRef.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out(405, { error: "method_not_allowed" });
  const ctx = adminClient();
  if (!ctx) return out(503, { error: "server_not_configured" });
  let b: any;
  try { b = await req.json(); } catch { return out(400, { error: "invalid_json" }); }
  const caller = await resolveCaller(req, ctx, b?.organizationId);
  if (caller instanceof Response) return caller;

  if (typeof b.externalRef !== "string" || !/^[\w./-]{1,64}$/.test(b.externalRef)) return out(400, { error: "invalid_external_ref" });
  if (!Number.isSafeInteger(b.amountMinorUnits) || b.amountMinorUnits <= 0 || b.amountMinorUnits > 9_000_000_000_000) return out(400, { error: "invalid_amount" });
  const minutes = b.expiresInMinutes === undefined ? 30 : b.expiresInMinutes;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return out(400, { error: "invalid_expiry" });
  const tail = b.expectedReferenceTail ? String(b.expectedReferenceTail).trim().toUpperCase() : null;
  if (tail && !/^[A-Z0-9]{4,12}$/.test(tail)) return out(400, { error: "invalid_reference_tail" });
  const phone = b.customerPhoneLast4 ? String(b.customerPhoneLast4).trim() : null;
  if (phone && !/^[0-9]{4}$/.test(phone)) return out(400, { error: "invalid_phone" });
  const description = typeof b.description === "string" ? b.description.slice(0, 200) : null;
  if (b.bankAccountId !== undefined && b.bankAccountId !== null && !isUuid(b.bankAccountId)) return out(400, { error: "invalid_bank_account" });
  if (b.bankAccountId) {
    const { data: acc } = await ctx.admin.from("pv_bank_accounts").select("id").eq("id", b.bankAccountId).eq("organization_id", caller.orgId).maybeSingle();
    if (!acc) return out(400, { error: "bank_account_not_found" });
  }

  const amount = b.amountMinorUnits / 100;
  const row = {
    organization_id: caller.orgId, external_ref: b.externalRef, description, amount,
    bank_account_id: b.bankAccountId ?? null, customer_phone_last4: phone, expected_reference_tail: tail,
    expires_at: new Date(Date.now() + minutes * 60_000).toISOString(), created_by: caller.userId,
  };
  const { data, error } = await ctx.admin.from("payverify_orders").insert(row)
    .select("id,external_ref,status,expires_at,amount").maybeSingle();
  if (error?.code === "23505") {
    const { data: existing } = await ctx.admin.from("payverify_orders").select("id,external_ref,status,expires_at,amount")
      .eq("organization_id", caller.orgId).eq("external_ref", b.externalRef).maybeSingle();
    if (existing && Number(existing.amount) !== amount) return out(409, { error: "external_ref_amount_conflict" });
    if (existing) return out(200, { orderId: existing.id, externalRef: existing.external_ref, status: existing.status, expiresAt: existing.expires_at, duplicate: true });
  }
  if (error || !data) return out(500, { error: "order_create_failed" });
  return out(201, { orderId: data.id, externalRef: data.external_ref, status: data.status, expiresAt: data.expires_at, duplicate: false });
});
