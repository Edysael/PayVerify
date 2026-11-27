import { adminClient, cors, isUuid, out, resolveCaller } from "../_shared/auth.ts";

type MovementType = "GENERIC" | "MOVIL_PAY" | "TRANSFER";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validReference(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z0-9/_-]{4,64}$/.test(value.trim().toUpperCase());
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * PayVerify -> Pabilo bank verification.
 *
 * This endpoint returns bank-provider evidence only. It deliberately does not
 * change an order to paid_confirmed: the evidence must be persisted and linked
 * to the exact PayVerify order/account in a later atomic reconciliation step.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out(405, { error: "method_not_allowed" });

  const ctx = adminClient();
  if (!ctx) return out(503, { error: "server_not_configured" });

  let body: unknown;
  try { body = await req.json(); } catch { return out(400, { error: "invalid_json" }); }
  if (!isRecord(body) || !isUuid(body.organizationId) || !isUuid(body.orderId) ||
      !validReference(body.bankReference)) {
    return out(400, { error: "invalid_payload" });
  }

  const caller = await resolveCaller(req, ctx, body.organizationId, ["owner", "admin", "operator"]);
  if (caller instanceof Response) return caller;

  const pabiloApiKey = Deno.env.get("PABILO_API_KEY");
  const pabiloUserBankId = Deno.env.get("PABILO_USER_BANK_ID");
  const allowedOrganizationId = Deno.env.get("PABILO_ORGANIZATION_ID");
  const payverifyBankAccountId = Deno.env.get("PABILO_PAYVERIFY_BANK_ACCOUNT_ID");

  // Fail closed until the provider account is explicitly mapped to one PayVerify
  // organization and one of its bank accounts. Prevents cross-tenant verification.
  if (!pabiloApiKey || !pabiloUserBankId || !isUuid(allowedOrganizationId) ||
      !isUuid(payverifyBankAccountId)) {
    return out(503, { error: "pabilo_not_configured" });
  }
  if (caller.orgId !== allowedOrganizationId) return out(403, { error: "pabilo_org_not_allowed" });

  const { data: order, error: orderError } = await ctx.admin.from("payverify_orders")
    .select("id,organization_id,amount,bank_account_id,status,expires_at")
    .eq("id", body.orderId).eq("organization_id", caller.orgId).maybeSingle();
  if (orderError) return out(500, { error: "order_lookup_failed" });
  if (!order) return out(404, { error: "order_not_found" });
  if (order.status === "paid_confirmed") return out(409, { error: "order_already_paid" });
  if (order.status === "cancelled" || order.status === "expired" ||
      (order.status === "pending" && new Date(order.expires_at).getTime() < Date.now())) {
    return out(409, { error: "order_not_payable" });
  }
  if (order.bank_account_id !== payverifyBankAccountId) {
    return out(409, { error: "order_bank_account_not_mapped_to_pabilo" });
  }

  const reference = body.bankReference.trim().toUpperCase();
  const movementType: MovementType = body.movementType === undefined ? "GENERIC" : body.movementType as MovementType;
  if (!["GENERIC", "MOVIL_PAY", "TRANSFER"].includes(movementType)) {
    return out(400, { error: "invalid_movement_type" });
  }
  const paymentDate = body.paymentDate === undefined ? new Date().toISOString().slice(0, 10) : body.paymentDate;
  if (!validDate(paymentDate)) return out(400, { error: "invalid_payment_date" });

  const payload: Record<string, unknown> = {
    bank_reference: reference,
    amount: Number(order.amount),
    movement_type: movementType,
    fecha_pago: paymentDate,
  };

  if (body.payerDni !== undefined) {
    if (!isRecord(body.payerDni) || !["V", "E", "J", "P", "G"].includes(String(body.payerDni.dni_type)) ||
        typeof body.payerDni.dni_number !== "string" ||
        !/^\d{5,12}$/.test(body.payerDni.dni_number)) {
      return out(400, { error: "invalid_payer_dni" });
    }
    payload.dni_pagador = { dni_type: body.payerDni.dni_type, dni_number: body.payerDni.dni_number };
  }
  if (body.payerPhone !== undefined) {
    if (typeof body.payerPhone !== "string" || !/^04\d{9}$/.test(body.payerPhone)) {
      return out(400, { error: "invalid_payer_phone" });
    }
    payload.phone_pagador = body.payerPhone;
  }
  if (body.originBankCode !== undefined) {
    if (typeof body.originBankCode !== "string" || !/^\d{4}$/.test(body.originBankCode)) {
      return out(400, { error: "invalid_origin_bank_code" });
    }
    payload.bank_origin = body.originBankCode;
  }

  let providerResponse: Response;
  try {
    providerResponse = await fetch(
      `https://api.pabilo.app/userbankpayment/${encodeURIComponent(pabiloUserBankId)}/betaserio`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${pabiloApiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12_000),
      },
    );
  } catch {
    return out(502, { error: "pabilo_unreachable" });
  }

  let providerBody: unknown;
  try { providerBody = await providerResponse.json(); } catch { return out(502, { error: "pabilo_invalid_response" }); }
  if (!providerResponse.ok) {
    if (providerResponse.status === 404) return out(404, { error: "bank_payment_not_found" });
    if (providerResponse.status === 402) return out(402, { error: "pabilo_credits_exhausted" });
    if (providerResponse.status === 400) return out(400, { error: "pabilo_rejected_verification_request" });
    if (providerResponse.status === 401 || providerResponse.status === 403) return out(503, { error: "pabilo_credentials_or_permissions_invalid" });
    return out(502, { error: "pabilo_verification_failed" });
  }

  const root = isRecord(providerBody) ? providerBody : {};
  const data = isRecord(root.data) ? root.data : root;
  const payment = isRecord(data.user_bank_payment) ? data.user_bank_payment : null;
  if (!payment) return out(502, { error: "pabilo_payment_record_missing" });

  const providerStatus = typeof payment.status === "string" ? payment.status.toLowerCase() : "";
  const providerReference = typeof payment.bank_reference_id === "string" ? payment.bank_reference_id.trim().toUpperCase() : "";
  const providerAmount = typeof payment.amount === "number" ? payment.amount : Number(payment.amount);
  const verifiedStatus = providerStatus === "verified" || providerStatus === "paid";
  const referenceMatches = providerReference === reference;
  const amountMatches = Number.isFinite(providerAmount) && Math.round(providerAmount * 100) === Math.round(Number(order.amount) * 100);

  if (!verifiedStatus || !referenceMatches || !amountMatches) {
    return out(409, {
      error: "pabilo_result_mismatch",
      providerStatus: providerStatus || "unknown",
      referenceMatches,
      amountMatches,
    });
  }

  return out(200, {
    provider: "pabilo",
    verificationStatus: "provider_verified",
    bankReference: providerReference,
    amount: providerAmount,
    currency: "VES",
    paymentDate: typeof data.payment_date === "string" ? data.payment_date : paymentDate,
    providerPaymentId: typeof payment.id === "string" ? payment.id : null,
    duplicateProviderVerification: data.is_new === false,
    orderId: order.id,
    // Not a PayVerify paid-state transition. Persist provider evidence and link it
    // atomically before setting paid_confirmed.
    paid: false,
    requiresReconciliation: true,
  });
});
