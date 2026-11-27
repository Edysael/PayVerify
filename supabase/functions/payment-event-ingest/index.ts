import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: cors });

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function boundedString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}
function validUuid(v: unknown): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return reply(401, { error: "unauthorized" });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply(503, { error: "server_not_configured" });

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return reply(401, { error: "invalid_session" });

  let body: unknown;
  try { body = await req.json(); } catch { return reply(400, { error: "invalid_json" }); }
  if (!isRecord(body) || !validUuid(body.organizationId) || !validUuid(body.deviceId) ||
      !validUuid(body.eventId) || !boundedString(body.reference, 64) ||
      !boundedString(body.senderIdentifier, 80) || !boundedString(body.currency, 3) || !boundedString(body.idempotencyKey, 64) ||
      typeof body.amountMinorUnits !== "number" || !Number.isSafeInteger(body.amountMinorUnits) ||
      body.amountMinorUnits <= 0 || typeof body.transactionTimeMillis !== "number" ||
      !Number.isSafeInteger(body.transactionTimeMillis) || body.transactionTimeMillis <= 0) {
    return reply(400, { error: "invalid_payload" });
  }
  if (body.currency !== "VES") return reply(400, { error: "unsupported_currency" });
  if (!/^[A-Z0-9/_-]{4,64}$/.test(body.reference as string)) return reply(400, { error: "invalid_reference" });
  if (!/^[a-f0-9]{64}$/.test(body.idempotencyKey as string)) return reply(400, { error: "invalid_idempotency_key" });
  const now = Date.now();
  if ((body.transactionTimeMillis as number) > now + 10 * 60 * 1000 ||
      (body.transactionTimeMillis as number) < now - 90 * 24 * 60 * 60 * 1000) {
    return reply(400, { error: "transaction_time_out_of_range" });
  }
  const canonical = [
    String(body.amountMinorUnits),
    String(body.currency).toUpperCase(),
    String(body.reference).trim().toUpperCase(),
    String(body.transactionTimeMillis),
    String(body.senderIdentifier).trim().toUpperCase()
  ].join("|");
  const expectedKey = await sha256Hex(canonical);
  if (expectedKey !== body.idempotencyKey) return reply(400, { error: "idempotency_key_mismatch" });

  // Optional payer hints (added in 0005). Invalid optional values are dropped, never fatal.
  const originPhone = typeof body.originPhone === "string" && /^04(12|14|16|24|26)[0-9]{7}$/.test(body.originPhone) ? body.originPhone : null;
  const originPhoneLast4 = typeof body.originPhoneLast4 === "string" && /^[0-9]{4}$/.test(body.originPhoneLast4)
    ? body.originPhoneLast4 : (originPhone ? originPhone.slice(-4) : null);
  const originBankCode = typeof body.originBankCode === "string" && /^01[0-9]{2}$/.test(body.originBankCode) ? body.originBankCode : null;
  const captureChannel = body.channel === "notification" ? "notification" : "sms";

  const { data: membership } = await admin.from("pv_organization_members")
    .select("id,role").eq("organization_id", body.organizationId)
    .eq("user_id", userData.user.id).eq("status", "active")
    .in("role", ["owner", "admin", "operator"]).maybeSingle();
  if (!membership) return reply(403, { error: "organization_access_denied" });

  const { data: device } = await admin.from("pv_devices").select("id,device_status")
    .eq("id", body.deviceId).eq("organization_id", body.organizationId)
    .eq("user_id", userData.user.id).maybeSingle();
  if (!device || device.device_status === "revoked") return reply(403, { error: "device_not_active_or_not_owned" });
  if (device.device_status !== "active") return reply(425, { error: "device_pending_approval" });

  const { data: senderRule } = await admin.from("pv_authorized_sms_senders")
    .select("id,bank_account_id").eq("organization_id", body.organizationId)
    .eq("sender_identifier", body.senderIdentifier).eq("enabled", true).maybeSingle();
  if (!senderRule) return reply(425, { error: "sender_not_configured_or_disabled" });

  // Never accept or store raw SMS text, sender message body, OTP, PIN, or bank credentials.
  const amount = (body.amountMinorUnits as number) / 100;

  // Same payment announced through another channel (SMS + app notification): keep it, flag it, never match it.
  const windowMs = 48 * 60 * 60 * 1000;
  const { data: twin } = await admin.from("pv_payment_events").select("id")
    .eq("organization_id", body.organizationId).eq("amount", amount)
    .eq("reference", (body.reference as string).trim())
    .gte("transaction_date", new Date((body.transactionTimeMillis as number) - windowMs).toISOString())
    .lte("transaction_date", new Date((body.transactionTimeMillis as number) + windowMs).toISOString())
    .neq("idempotency_key", body.idempotencyKey).limit(1).maybeSingle();
  const { data: inserted, error: insertError } = await admin.from("pv_payment_events")
    .insert({
      id: body.eventId,
      organization_id: body.organizationId,
      device_id: body.deviceId,
      bank_account_id: senderRule.bank_account_id,
      amount,
      currency: "VES",
      reference: body.reference.trim(),
      transaction_date: new Date(body.transactionTimeMillis).toISOString(),
      event_time_source: "sms_received",
      source_type: "sms",
      verification_status: twin ? "POSSIBLE_DUPLICATE" : "RECEIVED_BY_SERVER",
      idempotency_key: body.idempotencyKey,
      origin_phone: originPhone,
      origin_phone_last4: originPhoneLast4,
      origin_bank_code: originBankCode,
      capture_channel: captureChannel,
    }).select("id,verification_status").maybeSingle();

  if (insertError?.code === "23505") {
    const { data: existing } = await admin.from("pv_payment_events").select("id,verification_status")
      .eq("organization_id", body.organizationId).eq("idempotency_key", body.idempotencyKey).maybeSingle();
    if (existing) return reply(200, { accepted: true, duplicate: true, eventId: existing.id, status: existing.verification_status });
  }
  if (insertError || !inserted) return reply(500, { error: "event_persistence_failed" });
  await admin.from("pv_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", body.deviceId);
  // Try to link this payment to a pending order. A failure here must never lose the payment.
  let order: { matched: boolean; orderId?: string; method?: string; orderStatus?: string } = { matched: false };
  if (inserted.verification_status !== "POSSIBLE_DUPLICATE") {
    const { data: m, error: matchError } = await admin.rpc("payverify_match_payment", { p_payment_id: inserted.id });
    if (!matchError && m) order = m;
  }
  return reply(201, {
    accepted: true, duplicate: false, eventId: inserted.id, status: inserted.verification_status,
    orderMatched: !!order.matched, orderId: order.orderId ?? null, orderStatus: order.orderStatus ?? null,
  });
});
