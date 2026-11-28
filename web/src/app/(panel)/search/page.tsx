import Link from "next/link";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { getOrganizations } from "../../../lib/organization";
import OrganizationPicker from "../../../components/OrganizationPicker";
import { formatCurrency, formatDate } from "../../../lib/format";
import { ORDER_STATUS_LABELS, effectiveStatus, type OrderRow } from "../../../lib/orders";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "../../../lib/payments-types";

/** "1.250,50" / "1250.5" / "1250" -> 1250.5; null si no parece un monto. */
function asAmount(q: string): number | null {
  const s = q.replace(/\s|Bs\.?|VES/gi, "");
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const lastComma = s.lastIndexOf(","), lastDot = s.lastIndexOf(".");
  const dec = lastComma > lastDot ? "," : ".";
  const norm = dec === "," ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(norm);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="main"><h1 className="title">Búsqueda</h1><p className="muted">Configura Supabase.</p></main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { organizations, activeId } = await getOrganizations(supabase, user.id);
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 64);
  const head = <><p className="muted">Búsqueda</p><h1 className="title">{q ? `Resultados para «${q}»` : "Buscar"}</h1></>;
  if (!activeId) return <main className="main">{head}<OrganizationPicker organizations={organizations} activeId={activeId} /><p>Selecciona una organización.</p></main>;
  if (!q) return <main className="main">{head}<OrganizationPicker organizations={organizations} activeId={activeId} /><div className="panel"><p className="muted" style={{ margin: 0 }}>Escribe una referencia de orden, una referencia bancaria o un monto en el buscador de arriba (atajo ⌘K / Ctrl K).</p></div></main>;

  // Solo caracteres seguros para el patrón ILIKE.
  const like = `%${q.replace(/[%_\\,()*]/g, "")}%`;
  const amount = asAmount(q);
  const ordersQ = supabase.from("payverify_orders").select("id,external_ref,description,amount,currency,status,expires_at,created_at,match_method,matched_payment_event_id,customer_phone_last4,expected_reference_tail").eq("organization_id", activeId);
  const paysQ = supabase.from("pv_payment_events").select("id,amount,currency,reference,transaction_date,verification_status").eq("organization_id", activeId);
  const [ordersRes, paysRes] = await Promise.all([
    (amount !== null ? ordersQ.or(`external_ref.ilike.${like},amount.eq.${amount}`) : ordersQ.ilike("external_ref", like)).order("created_at", { ascending: false }).limit(25),
    (amount !== null ? paysQ.or(`reference.ilike.${like},amount.eq.${amount}`) : paysQ.ilike("reference", like)).order("transaction_date", { ascending: false }).limit(25),
  ]);
  const orders = (ordersRes.data ?? []) as OrderRow[];
  const pays = paysRes.data ?? [];

  return <main className="main">
    {head}
    <OrganizationPicker organizations={organizations} activeId={activeId} />
    <section className="panel" style={{ overflowX: "auto" }}>
      <h2>Órdenes ({orders.length})</h2>
      {orders.length === 0 ? <p className="muted">Sin órdenes que coincidan.</p> : <table>
        <thead><tr>{["Orden", "Monto", "Estado", "Creada"].map((h) => <th key={h} style={{ textAlign: "left", padding: 10 }}>{h}</th>)}</tr></thead>
        <tbody>{orders.map((o) => <tr key={o.id}>
          <td style={{ padding: 10 }}><Link href="/orders">{o.external_ref}</Link>{o.description && <><br /><small>{o.description}</small></>}</td>
          <td style={{ padding: 10 }}>{formatCurrency(Number(o.amount), o.currency)}</td>
          <td style={{ padding: 10 }}>{ORDER_STATUS_LABELS[effectiveStatus(o)]}</td>
          <td style={{ padding: 10 }}>{formatDate(o.created_at)}</td>
        </tr>)}</tbody></table>}
    </section>
    <section className="panel" style={{ overflowX: "auto" }}>
      <h2>Pagos ({pays.length})</h2>
      {pays.length === 0 ? <p className="muted">Sin pagos que coincidan.</p> : <table>
        <thead><tr>{["Fecha", "Referencia", "Monto", "Estado"].map((h) => <th key={h} style={{ textAlign: "left", padding: 10 }}>{h}</th>)}</tr></thead>
        <tbody>{pays.map((p) => <tr key={p.id}>
          <td style={{ padding: 10 }}>{formatDate(p.transaction_date)}</td>
          <td style={{ padding: 10 }}><Link href="/payments">{p.reference}</Link></td>
          <td style={{ padding: 10 }}>{formatCurrency(Number(p.amount), p.currency ?? "VES")}</td>
          <td style={{ padding: 10 }}>{PAYMENT_STATUS_LABELS[p.verification_status as PaymentStatus] ?? p.verification_status}</td>
        </tr>)}</tbody></table>}
    </section>
  </main>;
}
