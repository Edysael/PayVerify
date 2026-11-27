import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import { getOrganizations } from "../../lib/organization";
import OrganizationPicker from "../../components/OrganizationPicker";
import TrendChart from "../../components/dashboard/TrendChart";
import RangeSelect from "../../components/dashboard/RangeSelect";
import { buildTrend, formatInt, formatPercent, parseRange, percentChange, share, timeAgo } from "../../lib/dashboard";
import { formatCurrency } from "../../lib/format";
import {
  IconAlert, IconArrowDown, IconArrowRight, IconArrowUp, IconBolt, IconBuilding, IconChart, IconCheck, IconCheckCircle,
  IconClock, IconCopy, IconLayers, IconPlus, IconSearch, IconUploadCloud,
} from "../../components/ui/Icons";

const TZ = "America/Caracas";

function Wave({ color }: { color: string }) {
  return <svg className="wave" viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 120 C40 95 60 60 110 62 C150 64 170 30 200 10 L200 120 Z" fill={color} />
  </svg>;
}

type Activity = { key: string; at: string; title: string; sub: string; tone: "green" | "amber" | "blue" | "red" | "purple"; badge: string; icon: "check" | "clock" | "upload" | "copy" | "layers" | "alert" };
const ICONS = { check: IconCheckCircle, clock: IconClock, upload: IconUploadCloud, copy: IconCopy, layers: IconLayers, alert: IconAlert };

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="main"><h1 className="title">PayVerify</h1><p className="muted">Configura Supabase en el entorno web.</p></main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { organizations, activeId } = await getOrganizations(supabase, user.id);
  const range = parseRange((await searchParams).range);

  const head = <header className="page-head">
    <p className="eyebrow">Centro de operaciones</p>
    <h1 className="title">Resumen de pagos</h1>
    <p className="subtitle">Monitorea, verifica y concilia los pagos de tu organización en un solo lugar.</p>
  </header>;
  const orgRow = <div className="org-row">
    <OrganizationPicker organizations={organizations} activeId={activeId} />
    <Link href="/organizations/new" className="btn-outline"><IconBuilding size={20} />{organizations.length ? "Crear otra organización" : "Crear organización"}</Link>
  </div>;

  if (!activeId) return <main className="main">{head}{orgRow}
    <div className="panel"><p className="muted" style={{ margin: 0 }}>{organizations.length
      ? "Selecciona una organización para ver su resumen. Cuando tienes varias, no se elige ninguna automáticamente."
      : "Crea tu primera organización para empezar a registrar y conciliar pagos."}</p></div>
  </main>;

  const now = new Date();
  const since = new Date(now.getTime() - 2 * range * 86_400_000).toISOString();
  const count = () => supabase.from("pv_payment_events").select("id", { count: "exact", head: true }).eq("organization_id", activeId);
  const [all, pending, reconciled, duplicates, periodRes, recentRes, batchesRes] = await Promise.all([
    count(),
    count().eq("verification_status", "PENDING_REVIEW"),
    count().eq("verification_status", "RECONCILED"),
    count().eq("verification_status", "POSSIBLE_DUPLICATE"),
    supabase.from("pv_payment_events").select("transaction_date,verification_status")
      .eq("organization_id", activeId).gte("transaction_date", since).limit(10000),
    supabase.from("pv_payment_events").select("id,amount,currency,reference,verification_status,created_at,matched_order_id")
      .eq("organization_id", activeId).order("created_at", { ascending: false }).limit(6),
    supabase.from("pv_statement_import_batches").select("id,source_label,imported_count,row_count,status,created_at")
      .eq("organization_id", activeId).order("created_at", { ascending: false }).limit(3),
  ]);

  const total = all.count ?? 0, nPending = pending.count ?? 0, nRec = reconciled.count ?? 0, nDup = duplicates.count ?? 0;
  const period = periodRes.data ?? [];
  const points = buildTrend(period, range, now, TZ);
  const cutoff = now.getTime() - range * 86_400_000;
  const current = period.filter((p) => new Date(p.transaction_date).getTime() >= cutoff).length;
  const previous = period.length - current;
  const change = percentChange(current, previous);
  const recShare = share(nRec, total);

  // Actividad reciente: pagos y extractos, del más nuevo al más viejo.
  const recent = recentRes.data ?? [];
  const orderIds = [...new Set(recent.map((p) => p.matched_order_id).filter((v): v is string => !!v))];
  const ordersRes = orderIds.length
    ? await supabase.from("payverify_orders").select("id,external_ref").in("id", orderIds)
    : { data: [] as { id: string; external_ref: string }[] };
  const refOf = new Map<string, string>((ordersRes.data ?? []).map((o: { id: string; external_ref: string }) => [o.id, o.external_ref] as [string, string]));
  const activity: Activity[] = [
    ...recent.map((p): Activity => {
      const order = p.matched_order_id ? refOf.get(p.matched_order_id) : null;
      const sub = order ? `Orden #${order} • Ref. ${p.reference}` : `Ref. ${p.reference} • ${formatCurrency(Number(p.amount), p.currency ?? "VES")}`;
      const base = { key: `p-${p.id}`, at: p.created_at as string, sub };
      switch (p.verification_status) {
        case "RECONCILED": return { ...base, title: "Pago confirmado", tone: "green", badge: "Conciliado", icon: "check" };
        case "PENDING_REVIEW": return { ...base, title: "Pago por revisar", tone: "amber", badge: "Pendiente", icon: "clock" };
        case "POSSIBLE_DUPLICATE": return { ...base, title: "Posible duplicado", tone: "red", badge: "Revisión", icon: "copy" };
        case "REJECTED": case "PARSING_ERROR": return { ...base, title: "Pago rechazado", tone: "red", badge: "Rechazado", icon: "alert" };
        default: return { ...base, title: order ? "Pago detectado" : "Pago recibido", tone: "purple", badge: "Recibido", icon: "layers" };
      }
    }),
    ...(batchesRes.data ?? []).map((b): Activity => ({
      key: `b-${b.id}`, at: b.created_at as string, title: "Extracto importado",
      sub: `${b.source_label} • ${formatInt(b.imported_count ?? b.row_count ?? 0)} movimientos`, icon: "upload",
      tone: b.status === "failed" ? "red" : "blue",
      badge: b.status === "validated" ? "Procesado" : b.status === "failed" ? "Fallido" : "En proceso",
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);

  const errored = all.error || periodRes.error;
  return <main className="main">
    {head}
    {orgRow}
    {errored && <div className="panel" role="alert" style={{ marginTop: 0, marginBottom: 22 }}>No se pudieron cargar algunos datos. Verifica tu sesión y permisos.</div>}

    <section className="stats" aria-label="Indicadores">
      <div className="stat purple">
        <div className="head"><span className="ic"><IconLayers size={28} /></span><div><div className="lbl">Pagos registrados</div><div className="num">{formatInt(total)}</div></div></div>
        <span className="chip">{change === null
          ? <>Sin datos del periodo anterior</>
          : <><span className="pill">{change >= 0 ? <IconArrowUp size={16} style={{ color: "#4ade80" }} /> : <IconArrowDown size={16} style={{ color: "#fca5a5" }} />}{formatPercent(change, true)}</span>vs. periodo anterior</>}</span>
        <Wave color="rgba(167,139,250,.35)" />
      </div>
      <div className="stat blue">
        <div className="head"><span className="ic"><IconClock size={28} /></span><div><div className="lbl">Pendientes de revisión</div><div className="num">{formatInt(nPending)}</div></div></div>
        {nPending > 0 ? <span className="chip"><IconAlert size={16} />Requieren atención</span> : <span className="chip ok"><IconCheck size={16} />Al día</span>}
        <Wave color="rgba(147,197,253,.35)" />
      </div>
      <div className="stat green">
        <div className="head"><span className="ic"><IconCheckCircle size={28} /></span><div><div className="lbl">Conciliados</div><div className="num">{formatInt(nRec)}</div></div></div>
        {recShare === null ? <span className="chip neutral">Sin pagos aún</span> : <span className="chip"><IconCheck size={16} />{formatPercent(recShare)} del total</span>}
        <Wave color="rgba(134,239,172,.35)" />
      </div>
      <div className="stat red">
        <div className="head"><span className="ic"><IconCopy size={28} /></span><div><div className="lbl">Posibles duplicados</div><div className="num">{formatInt(nDup)}</div></div></div>
        {nDup > 0 ? <Link href="/payments" className="chip" style={{ textDecoration: "none" }}><IconAlert size={16} />En revisión</Link> : <span className="chip ok"><IconCheck size={16} />Sin alertas</span>}
        <Wave color="rgba(252,165,165,.35)" />
      </div>
    </section>

    <section className="grid-2">
      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="ttl"><span className="ttl-ic"><IconChart size={20} /></span><h2>Tendencia de pagos</h2></div>
            <p className="panel-sub" style={{ marginLeft: 50 }}>Pagos registrados vs. conciliados en los últimos {range} días.</p>
          </div>
          <RangeSelect value={range} />
        </div>
        <TrendChart points={points} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="ttl"><IconLayers size={24} style={{ color: "var(--brand)" }} /><h2>Actividad reciente</h2></div>
          <Link href="/payments" className="link-all">Ver todo <IconArrowRight size={16} /></Link>
        </div>
        {activity.length === 0
          ? <div className="empty" style={{ marginTop: 14 }}>Aún no hay actividad. Los pagos detectados y los extractos importados aparecerán aquí.</div>
          : <ul className="activity">{activity.map((a) => {
            const Icon = ICONS[a.icon];
            return <li key={a.key}>
              <span className={`act-ic ${a.tone}`}><Icon size={22} /></span>
              <div style={{ minWidth: 0 }}><div className="act-title">{a.title}</div><div className="act-sub">{a.sub}</div></div>
              <div className="act-meta"><span className="act-time">{timeAgo(a.at, now)}</span><span className={`badge ${a.tone === "blue" ? "purple" : a.tone}`}>{a.badge}</span></div>
            </li>;
          })}</ul>}
      </div>
    </section>

    <h2 className="section-title"><IconBolt size={24} />Acciones rápidas</h2>
    <nav className="quick" aria-label="Acciones rápidas">
      <Link href="/payments" className="q1"><span className="q-ic"><IconSearch size={24} /></span><span><span className="q-t" style={{ display: "block" }}>Consultar pagos</span><span className="q-s">Busca y revisa movimientos</span></span><IconArrowRight size={20} className="q-arrow" /></Link>
      <Link href="/statements" className="q2"><span className="q-ic"><IconUploadCloud size={24} /></span><span><span className="q-t" style={{ display: "block" }}>Importar extracto</span><span className="q-s">Carga tu extracto bancario (CSV)</span></span><IconArrowRight size={20} className="q-arrow" /></Link>
      <Link href="/statements#movimientos" className="q3"><span className="q-ic"><IconCheckCircle size={24} /></span><span><span className="q-t" style={{ display: "block" }}>Revisar conciliación</span><span className="q-s">Valida y concilia movimientos</span></span><IconArrowRight size={20} className="q-arrow" /></Link>
      <Link href="/orders/new" className="q4"><span className="q-ic"><IconPlus size={24} /></span><span><span className="q-t" style={{ display: "block" }}>Crear orden de pago</span><span className="q-s">Registra una nueva orden</span></span><IconArrowRight size={20} className="q-arrow" /></Link>
    </nav>
  </main>;
}
