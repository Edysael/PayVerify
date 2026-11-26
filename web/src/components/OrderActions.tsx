"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { effectiveStatus, type OrderRow, type UnmatchedPayment } from "../lib/orders";
import { formatDate } from "../lib/format";

export default function OrderActions({ organizationId, order, candidates }: {
  organizationId: string; order: OrderRow; candidates: UnmatchedPayment[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentId, setPaymentId] = useState(candidates[0]?.id ?? "");
  const status = effectiveStatus(order);

  async function run(action: "approve" | "reject_match" | "link" | "cancel", confirmText: string) {
    if (!supabase || !window.confirm(confirmText)) return;
    setBusy(true); setMessage("");
    const { data, error } = await supabase.functions.invoke("order-action", {
      body: { organizationId, orderId: order.id, action, paymentId: action === "link" ? paymentId : undefined },
    });
    setBusy(false);
    if (error || !data?.ok) { setMessage(error?.message ?? "No se pudo completar la acción."); return; }
    setMessage("Listo."); router.refresh();
  }

  return <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
    {status === "needs_review" && <>
      <button disabled={busy} onClick={() => void run("approve", `¿Confirmas que el pago detectado corresponde a la orden ${order.external_ref}?`)}>Es este pago</button>
      <button disabled={busy} onClick={() => void run("reject_match", "¿Este pago NO corresponde a la orden? Quedará libre para otra orden.")}>No es</button>
    </>}
    {(status === "pending" || status === "expired") && candidates.length > 0 && <>
      <select value={paymentId} onChange={(e) => setPaymentId(e.target.value)} aria-label="Pago a vincular">
        {candidates.map((p) => <option key={p.id} value={p.id}>
          Ref {p.reference} · {formatDate(p.transaction_date)}{p.origin_phone_last4 ? ` · tel …${p.origin_phone_last4}` : ""}
        </option>)}
      </select>
      <button disabled={busy || !paymentId} onClick={() => void run("link", `¿Vincular el pago seleccionado a la orden ${order.external_ref}?`)}>Vincular pago</button>
    </>}
    {(status === "pending" || status === "expired") && <button disabled={busy} onClick={() => void run("cancel", `¿Cancelar la orden ${order.external_ref}?`)}>Cancelar</button>}
    {message && <small role="status">{message}</small>}
  </span>;
}
