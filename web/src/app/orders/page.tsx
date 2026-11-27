import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import { formatCurrency, formatDate } from "../../lib/format";
import { getOrganizations } from "../../lib/organization";
import OrganizationPicker from "../../components/OrganizationPicker";
import OrderActions from "../../components/OrderActions";
import {
  MATCH_METHOD_LABELS, ORDER_STATUS_LABELS, candidatePayments, effectiveStatus,
  type OrderRow, type UnmatchedPayment,
} from "../../lib/orders";

export default async function OrdersPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="main"><h1 className="title">Órdenes</h1><p className="muted">Configura Supabase.</p></main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="main"><h1 className="title">Órdenes</h1><Link href="/sign-in">Iniciar sesión</Link></main>;
  const { organizations, activeId } = await getOrganizations(supabase, user.id);
  if (!activeId) return <main className="main"><h1 className="title">Órdenes</h1><OrganizationPicker organizations={organizations} activeId={activeId} /><p>Selecciona una organización activa.</p></main>;

  const [ordersRes, unmatchedRes] = await Promise.all([
    supabase.from("payverify_orders")
      .select("id,external_ref,description,amount,currency,status,expires_at,created_at,match_method,matched_payment_event_id,customer_phone_last4,expected_reference_tail")
      .eq("organization_id", activeId).order("created_at", { ascending: false }).limit(100),
    supabase.from("pv_payment_events")
      .select("id,amount,reference,transaction_date,origin_phone_last4,origin_bank_code,capture_channel")
      .eq("organization_id", activeId).is("matched_order_id", null)
      .in("verification_status", ["RECEIVED_BY_SERVER", "PENDING_REVIEW", "RECONCILED"])
      .order("transaction_date", { ascending: false }).limit(50),
  ]);
  const orders = (ordersRes.data ?? []) as OrderRow[];
  const unmatched = (unmatchedRes.data ?? []) as UnmatchedPayment[];
  const review = orders.filter((o) => o.status === "needs_review").length;

  return <main className="main">
    <p className="muted">OPERACIONES / COBROS</p><h1 className="title">Órdenes y pagos</h1>
    <OrganizationPicker organizations={organizations} activeId={activeId} />
    <p className="muted">«Pago detectado» significa que llegó la notificación del banco y cuadra con la orden. Pasa a «Confirmado» cuando el movimiento aparece en el extracto.</p>
    {review > 0 && <div className="panel" role="alert"><strong>{review} orden(es) requieren tu revisión:</strong> llegó un pago con el mismo monto pero nada más confirma quién pagó.</div>}

    <section className="panel" style={{ overflowX: "auto" }}>
      <h2>Órdenes</h2>
      {ordersRes.error ? <p>No se pudieron cargar. Verifica sesión y RLS (¿aplicaste la migración 0005?).</p>
        : orders.length === 0 ? <p>Aún no hay órdenes. Tu checkout las crea con una llave de API.</p>
        : <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Orden", "Monto", "Estado", "Cruce", "Vence", "Acción"].map((h) => <th key={h} style={{ textAlign: "left", padding: 10 }}>{h}</th>)}</tr></thead>
          <tbody>{orders.map((o) => <tr key={o.id}>
            <td style={{ padding: 10 }}>{o.external_ref}{o.description && <><br /><small>{o.description}</small></>}</td>
            <td style={{ padding: 10 }}>{formatCurrency(Number(o.amount), o.currency)}</td>
            <td style={{ padding: 10 }}>{ORDER_STATUS_LABELS[effectiveStatus(o)]}</td>
            <td style={{ padding: 10 }}>{o.match_method ? MATCH_METHOD_LABELS[o.match_method] ?? o.match_method : "—"}</td>
            <td style={{ padding: 10 }}>{formatDate(o.expires_at)}</td>
            <td style={{ padding: 10 }}><OrderActions organizationId={activeId} order={o} candidates={candidatePayments(o, unmatched)} /></td>
          </tr>)}</tbody></table>}
    </section>

    <section className="panel" style={{ overflowX: "auto" }}>
      <h2>Pagos sin orden</h2>
      <p className="muted">Pagos detectados que no se pudieron cruzar con ninguna orden (llegaron tarde, sin orden, o hay varias con el mismo monto).</p>
      {unmatched.length === 0 ? <p>No hay pagos sin orden.</p>
        : <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Fecha", "Referencia", "Monto", "Origen", "Canal"].map((h) => <th key={h} style={{ textAlign: "left", padding: 10 }}>{h}</th>)}</tr></thead>
          <tbody>{unmatched.map((p) => <tr key={p.id}>
            <td style={{ padding: 10 }}>{formatDate(p.transaction_date)}</td>
            <td style={{ padding: 10 }}>{p.reference}</td>
            <td style={{ padding: 10 }}>{formatCurrency(Number(p.amount))}</td>
            <td style={{ padding: 10 }}>{p.origin_bank_code ?? "banco ?"} / {p.origin_phone_last4 ? `tel …${p.origin_phone_last4}` : "tel ?"}</td>
            <td style={{ padding: 10 }}>{p.capture_channel === "notification" ? "Notificación de app" : "SMS"}</td>
          </tr>)}</tbody></table>}
    </section>
  </main>;
}
