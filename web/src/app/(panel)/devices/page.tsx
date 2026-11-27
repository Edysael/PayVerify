import Link from "next/link";
import {createSupabaseServerClient} from "../../../lib/supabase-server";
import {getOrganizations} from "../../../lib/organization";
import OrganizationPicker from "../../../components/OrganizationPicker";
import DeviceApproveButton from "../../../components/DeviceApproveButton";
import DeviceRevokeButton from "../../../components/DeviceRevokeButton";
import {readerState} from "../../../lib/reader";
import {timeAgo} from "../../../lib/dashboard";

type DeviceRow={id:string;device_name:string;device_status:string;created_at:string;last_seen_at:string|null;
  last_heartbeat_at?:string|null;capture_active?:boolean;app_version?:string|null;battery_unrestricted?:boolean|null};
const STATUS:Record<string,[string,string]>={active:["Aprobado","green"],pending:["Pendiente","amber"],revoked:["Revocado","gray"]};

export default async function DevicesPage(){
 const supabase=await createSupabaseServerClient();if(!supabase)return <main className="main"><h1>Dispositivos</h1><p>Configura Supabase.</p></main>;
 const {data:{user}}=await supabase.auth.getUser();if(!user)return <main className="main"><h1>Dispositivos</h1><Link href="/sign-in">Iniciar sesión</Link></main>;
 const {organizations,activeId}=await getOrganizations(supabase,user.id);
 if(!activeId)return <main className="main"><h1>Dispositivos</h1><OrganizationPicker organizations={organizations} activeId={activeId}/><p>Selecciona una organización.</p></main>;
 const base="id,device_name,device_status,created_at,last_seen_at";
 // Las columnas del latido llegan con la migración 0013; si aún no está aplicada, se muestra la vista básica.
 const full=await supabase.from("pv_devices").select(`${base},last_heartbeat_at,capture_active,app_version,battery_unrestricted`).eq("organization_id",activeId).order("created_at",{ascending:false});
 const res:{data:unknown[]|null;error:unknown}=full.error?await supabase.from("pv_devices").select(base).eq("organization_id",activeId).order("created_at",{ascending:false}):full;
 const {error}=res;
 const rows=(res.data??[]) as DeviceRow[];
 const now=new Date();
 const anyOnline=rows.some(d=>readerState(d,now).tone==="green");
 return <main className="main"><p className="muted">Operaciones / Lectores</p><h1 className="title">Dispositivos</h1><OrganizationPicker organizations={organizations} activeId={activeId}/>
 {rows.some(d=>d.device_status==="active")&&!anyOnline&&<div className="panel" role="alert" style={{marginTop:0}}><b>⚠ Ningún teléfono lector está recibiendo pagos ahora.</b> Abre PayVerify en el teléfono de cobros y activa «Recibir pagos».</div>}
 <section className="panel"><h2>Solicitudes y dispositivos</h2>{error?<p>No se pudieron cargar dispositivos. Revisa RLS.</p>:!rows.length?<p>No hay dispositivos enrolados. Solicita el enrolamiento desde PayVerify Android.</p>:
 <div style={{overflowX:"auto"}}><table><thead><tr>{["Dispositivo","Estado","Recibir pagos","Creado","Acción"].map(x=><th key={x} style={{textAlign:"left",padding:12}}>{x}</th>)}</tr></thead><tbody>{rows.map(d=>{
  const st=STATUS[d.device_status]??[d.device_status,"gray"];
  const r=readerState(d,now);
  return <tr key={d.id}>
   <td style={{padding:12}}><b>{d.device_name}</b>{d.app_version?<small> · v{d.app_version}</small>:null}<br/><small>{d.id}</small></td>
   <td style={{padding:12}}><span className={`badge ${st[1]}`}>{st[0]}</span></td>
   <td style={{padding:12}}><span className={`badge ${r.tone}`}>{r.label}</span>
     {d.last_heartbeat_at?<><br/><small>Último latido: {timeAgo(d.last_heartbeat_at,now).toLowerCase()}</small></>:d.last_seen_at?<><br/><small>Última conexión: {new Date(d.last_seen_at).toLocaleString("es-CL")}</small></>:null}
     {d.device_status==="active"&&d.battery_unrestricted===false?<><br/><small style={{color:"#a16207"}}>Con ahorro de batería: puede retrasarse</small></>:null}</td>
   <td style={{padding:12}}>{new Date(d.created_at).toLocaleString("es-CL")}</td>
   <td style={{padding:12}}>{d.device_status==="pending"?<span><DeviceApproveButton deviceId={d.id}/> <DeviceRevokeButton deviceId={d.id} pending/></span>:d.device_status==="active"?<DeviceRevokeButton deviceId={d.id}/>:"Revocado"}</td>
  </tr>})}</tbody></table></div>}</section>
 <p className="muted">Un teléfono figura «Recibiendo» si tiene «Recibir pagos» activado y reportó un latido en los últimos 5 minutos. Aprueba solo dispositivos de tu organización cuyo enrolamiento pidió un usuario autorizado.</p></main>;
}
