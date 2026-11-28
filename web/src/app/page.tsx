import Link from "next/link";
import { createSupabaseServerClient } from "../lib/supabase-server";
import { getOrganizations } from "../lib/organization";
import OrganizationPicker from "../components/OrganizationPicker";
import SignOutButton from "../components/SignOutButton";

export default async function Home() {
  const supabase=await createSupabaseServerClient();
  if(!supabase) return <main className="main"><h1 className="title">PayVerify</h1><p className="muted">Configura Supabase en el entorno web.</p></main>;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return <main className="main"><h1 className="title">PayVerify</h1><p>Inicia sesión para continuar.</p><Link href="/sign-in">Iniciar sesión</Link></main>;
  const {organizations,activeId}=await getOrganizations(supabase,user.id);
  const shell=<aside className="sidebar"><div className="brand">PayVerify</div><div className="nav"><Link href="/">Resumen</Link><Link href="/orders">Órdenes</Link><Link href="/payments">Pagos</Link><Link href="/statements">Extractos y conciliación</Link><Link href="/devices">Dispositivos</Link><Link href="/descargar">Descargar app</Link><Link href="/settings/senders">Remitentes (SMS y apps)</Link><Link href="/settings/api-keys">Llaves de API</Link><SignOutButton/></div></aside>;
  if(!activeId) return <div className="shell">{shell}<main className="main"><h1 className="title">Centro de operaciones</h1><OrganizationPicker organizations={organizations} activeId={activeId}/>{organizations.length===0?<p><Link href="/organizations/new">Crear organización</Link></p>:null}<p className="muted">Selecciona una organización para consultar sus datos. No se selecciona automáticamente la primera cuando tienes varias.</p></main></div>;
  const base=supabase.from("pv_payment_events").select("id",{count:"exact",head:true}).eq("organization_id",activeId);
  const [all,pending,reconciled,duplicates]=await Promise.all([
    base,
    supabase.from("pv_payment_events").select("id",{count:"exact",head:true}).eq("organization_id",activeId).eq("verification_status","PENDING_REVIEW"),
    supabase.from("pv_payment_events").select("id",{count:"exact",head:true}).eq("organization_id",activeId).eq("verification_status","RECONCILED"),
    supabase.from("pv_payment_events").select("id",{count:"exact",head:true}).eq("organization_id",activeId).eq("verification_status","POSSIBLE_DUPLICATE"),
  ]);
  return <div className="shell">{shell}<main className="main">
    <p className="muted">CENTRO DE OPERACIONES</p><h1 className="title">Resumen de pagos</h1>
    <OrganizationPicker organizations={organizations} activeId={activeId}/>
    <p><Link href="/organizations/new">Crear otra organización</Link></p>
    <p className="muted">Notificaciones recibidas y conciliación de movimientos. SMS no equivale a confirmación bancaria.</p>
    <section className="cards">
      <div className="card"><h3>Pagos registrados</h3><div className="value">{all.error?"—":all.count??0}</div></div>
      <div className="card"><h3>Pendientes de revisión</h3><div className="value">{pending.error?"—":pending.count??0}</div></div>
      <div className="card"><h3>Conciliados</h3><div className="value">{reconciled.error?"—":reconciled.count??0}</div></div>
      <div className="card"><h3>Posibles duplicados</h3><div className="value">{duplicates.error?"—":duplicates.count??0}</div></div>
    </section>
    <section className="panel"><h2>Acciones</h2><p><Link href="/payments">Consultar pagos</Link></p><p><Link href="/statements">Importar extracto y revisar conciliación</Link></p></section>
    <p className="muted">Solo un movimiento del extracto y una confirmación autorizada pueden marcar un pago como conciliado.</p>
  </main></div>;
}
