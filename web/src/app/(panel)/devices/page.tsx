import Link from "next/link";
import {createSupabaseServerClient} from "../../../lib/supabase-server";
import {getOrganizations} from "../../../lib/organization";
import OrganizationPicker from "../../../components/OrganizationPicker";
import DeviceApproveButton from "../../../components/DeviceApproveButton";
import DeviceRevokeButton from "../../../components/DeviceRevokeButton";
export default async function DevicesPage(){
 const supabase=await createSupabaseServerClient();if(!supabase)return <main className="main"><h1>Dispositivos</h1><p>Configura Supabase.</p></main>;
 const {data:{user}}=await supabase.auth.getUser();if(!user)return <main className="main"><h1>Dispositivos</h1><Link href="/sign-in">Iniciar sesión</Link></main>;
 const {organizations,activeId}=await getOrganizations(supabase,user.id);
 if(!activeId)return <main className="main"><h1>Dispositivos</h1><OrganizationPicker organizations={organizations} activeId={activeId}/><p>Selecciona una organización.</p></main>;
 const {data,error}=await supabase.from("pv_devices").select("id,device_name,device_status,created_at,last_seen_at").eq("organization_id",activeId).order("created_at",{ascending:false});
 return <main className="main"><h1 className="title">Dispositivos</h1><OrganizationPicker organizations={organizations} activeId={activeId}/>
 <section className="panel"><h2>Solicitudes y dispositivos</h2>{error?<p>No se pudieron cargar dispositivos. Revisa RLS.</p>:!data?.length?<p>No hay dispositivos enrolados. Solicita el enrolamiento desde PayVerify Android.</p>:
 <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Dispositivo","Estado","Creado","Última conexión","Acción"].map(x=><th key={x} style={{textAlign:"left",padding:10}}>{x}</th>)}</tr></thead><tbody>{data.map(d=><tr key={d.id}><td style={{padding:10}}>{d.device_name}<br/><small>{d.id}</small></td><td style={{padding:10}}>{d.device_status}</td><td style={{padding:10}}>{new Date(d.created_at).toLocaleString("es-CL")}</td><td style={{padding:10}}>{d.last_seen_at?new Date(d.last_seen_at).toLocaleString("es-CL"):"—"}</td><td style={{padding:10}}>{d.device_status==="pending"?<span><DeviceApproveButton deviceId={d.id}/> <DeviceRevokeButton deviceId={d.id} pending/></span>:d.device_status==="active"?<DeviceRevokeButton deviceId={d.id}/>:"Revocado"}</td></tr>)}</tbody></table></div>}</section>
 <p className="muted">Aprobar solo dispositivos que pertenecen a la organización y cuyo enrolamiento fue solicitado por un usuario autorizado.</p></main>;
}
