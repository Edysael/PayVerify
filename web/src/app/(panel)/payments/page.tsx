import Link from "next/link";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { formatCurrency, formatDate } from "../../../lib/format";
import { PAYMENT_STATUS_LABELS, type PaymentRow } from "../../../lib/payments-types";
import { getOrganizations } from "../../../lib/organization";
import OrganizationPicker from "../../../components/OrganizationPicker";
import PaymentExportButton from "../../../components/PaymentExportButton";
import DuplicateResolveAction from "../../../components/DuplicateResolveAction";

const STATUS_TONE: Record<string,string> = {
  RECONCILED:"green", PENDING_REVIEW:"amber", POSSIBLE_DUPLICATE:"red", REJECTED:"red", PARSING_ERROR:"red",
  RECEIVED_BY_SERVER:"purple", SMS_DETECTED:"blue", DATA_EXTRACTED:"blue",
};

export default async function PaymentsPage() {
  const supabase=await createSupabaseServerClient();
  if(!supabase) return <main className="main"><h1 className="title">Pagos</h1><p className="muted">Configura Supabase.</p></main>;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return <main className="main"><h1 className="title">Pagos</h1><Link href="/sign-in">Iniciar sesión</Link></main>;
  const {organizations,activeId}=await getOrganizations(supabase,user.id);
  if(!activeId) return <main className="main"><h1 className="title">Pagos</h1><OrganizationPicker organizations={organizations} activeId={activeId}/><p>Selecciona una organización activa.</p></main>;
  const {data,error}=await supabase.from("pv_payment_events")
    .select("id,amount,currency,reference,transaction_date,event_time_source,verification_status,source_type,created_at")
    .eq("organization_id",activeId).order("transaction_date",{ascending:false}).limit(100);
  const rows=(data??[]) as PaymentRow[];
  return <main className="main">
    <p className="muted">OPERACIONES / REGISTROS</p><h1 className="title">Pagos registrados</h1>
    <OrganizationPicker organizations={organizations} activeId={activeId}/>
    <p className="muted">Últimos 100 registros. Datos de SMS son notificaciones detectadas, no confirmaciones bancarias.</p>
    <PaymentExportButton rows={rows}/>
    {error?<div className="panel">No se pudo cargar. Verifica sesión y RLS.</div>:rows.length===0?<div className="panel">No hay pagos registrados.</div>:
      <div className="panel" style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><tr>{["Fecha de notificación/registro","Referencia","Monto","Estado","Origen","Acción"].map(h=><th key={h} style={{textAlign:"left",padding:12}}>{h}</th>)}</tr></thead>
      <tbody>{rows.map(row=><tr key={row.id}><td style={{padding:12}}>{formatDate(row.transaction_date)}</td><td style={{padding:12}}>{row.reference}</td><td style={{padding:12}}>{formatCurrency(row.amount,row.currency)}</td><td style={{padding:12}}><span className={`badge ${STATUS_TONE[row.verification_status]??"gray"}`}>{PAYMENT_STATUS_LABELS[row.verification_status]??row.verification_status}</span></td><td style={{padding:12}}>{row.source_type==="sms"?"SMS":row.source_type}</td><td style={{padding:12}}>{row.verification_status==="POSSIBLE_DUPLICATE"?<DuplicateResolveAction paymentId={row.id}/>:null}</td></tr>)}</tbody></table></div>}
  </main>;
}
