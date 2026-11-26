import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import { getOrganizations } from "../../lib/organization";
import OrganizationPicker from "../../components/OrganizationPicker";
import StatementImport from "../../components/StatementImport";
import ReconcileAction from "../../components/ReconcileAction";
import UnreconcileAction from "../../components/UnreconcileAction";
import { findReconciliationCandidates } from "../../lib/reconciliation/candidates";

export default async function StatementsPage() {
  const supabase=await createSupabaseServerClient();
  if(!supabase) return <main className="main"><h1 className="title">Extractos y conciliación</h1><p>Configura Supabase.</p></main>;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return <main className="main"><h1 className="title">Extractos y conciliación</h1><Link href="/sign-in">Iniciar sesión</Link></main>;
  const {organizations,activeId}=await getOrganizations(supabase,user.id);
  if(!activeId) return <main className="main"><h1 className="title">Extractos y conciliación</h1><OrganizationPicker organizations={organizations} activeId={activeId}/><p>Selecciona una organización.</p></main>;
  const [linesResult,paymentsResult]=await Promise.all([
    supabase.from("pv_statement_lines").select("id,transaction_date,amount,currency,reference,reconciliation_status,batch_id").eq("organization_id",activeId).order("transaction_date",{ascending:false}).limit(500),
    supabase.from("pv_payment_events").select("id,amount,currency,reference,transaction_date,verification_status").eq("organization_id",activeId).order("transaction_date",{ascending:false}).limit(1000)
  ]);
  const lines=linesResult.data??[], payments=paymentsResult.data??[];
  return <main className="main">
    <p className="muted">CONTROL FINANCIERO</p><h1 className="title">Extractos y conciliación</h1>
    <OrganizationPicker organizations={organizations} activeId={activeId}/>
    <StatementImport organizationId={activeId}/>
    <section className="panel"><h2>Movimientos importados</h2>
      {linesResult.error?<p>No se pudieron cargar las líneas. Revisa permisos y migraciones.</p>:lines.length===0?<p>No hay movimientos importados.</p>:
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Fecha","Monto","Referencia","Estado","Candidatos"].map(h=><th key={h} style={{textAlign:"left",padding:10}}>{h}</th>)}</tr></thead>
      <tbody>{lines.map(line=>{
        const result=findReconciliationCandidates({
          amountMinorUnits:Math.round(Number(line.amount)*100),currency:line.currency,reference:line.reference,
          transactionTimeMillis:new Date(line.transaction_date).getTime(),fingerprint:line.id
        },payments.filter(p=>!["RECONCILED","REJECTED","PARSING_ERROR","POSSIBLE_DUPLICATE"].includes(p.verification_status)).map(p=>({id:p.id,amountMinorUnits:Math.round(Number(p.amount)*100),currency:p.currency,reference:p.reference,transactionTimeMillis:new Date(p.transaction_date).getTime()})));
        const candidate=result.candidatePaymentIds.length===1?payments.find(p=>p.id===result.candidatePaymentIds[0]):null;
        return <tr key={line.id}>
          <td style={{padding:10}}>{new Date(line.transaction_date).toLocaleString("es-CL")}</td>
          <td style={{padding:10}}>{Number(line.amount).toFixed(2)} {line.currency}</td>
          <td style={{padding:10}}>{line.reference??"—"}</td>
          <td style={{padding:10}}>{line.reconciliation_status}</td>
          <td style={{padding:10}}>
            {line.reconciliation_status==="matched"?<UnreconcileAction lineId={line.id}/>:
             result.decision==="none"?"Sin coincidencia":
             result.decision==="ambiguous"?`Ambiguo (${result.candidatePaymentIds.length})`:
             candidate?<ReconcileAction lineId={line.id} paymentId={candidate.id} reference={line.reference??""}/>:"Candidato"}
          </td>
        </tr>;
      })}</tbody></table></div>}
    </section>
    <p className="muted">Las coincidencias son sugerencias. En eventos SMS, la fecha usada es la hora de recepción del mensaje, no una hora bancaria verificada. Solo un operador autorizado puede confirmar; valida el extracto original con tu banco.</p>
  </main>;
}
