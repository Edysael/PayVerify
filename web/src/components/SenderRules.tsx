 "use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
type Sender={id:string;sender_identifier:string;bank_name:string;enabled:boolean};
export default function SenderRules({organizationId}:{organizationId:string}){
 const [sender,setSender]=useState("");const [bank,setBank]=useState("");const [enabled,setEnabled]=useState(true);
 const [rows,setRows]=useState<Sender[]>([]);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function load(){if(!supabase)return;const {data,error}=await supabase.from("pv_authorized_sms_senders").select("id,sender_identifier,bank_name,enabled").eq("organization_id",organizationId).order("created_at",{ascending:false});if(error)setMessage("No se pudieron cargar remitentes.");else setRows(data??[]);}
 useEffect(()=>{void load();},[organizationId]);
 async function add(e:React.FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setMessage("");
  const {error}=await supabase.from("pv_authorized_sms_senders").insert({organization_id:organizationId,sender_identifier:sender.trim(),bank_name:bank.trim()||"Banco no especificado",enabled});
  setBusy(false);if(error){setMessage("No se pudo guardar. Verifica que el remitente no exista y tu rol permita administrar.");return;}
  setSender("");setBank("");await load();setMessage("Remitente guardado.");
 }
 async function toggle(row:Sender){if(!supabase)return;const {error}=await supabase.from("pv_authorized_sms_senders").update({enabled:!row.enabled}).eq("id",row.id);if(error)setMessage("No se pudo cambiar el estado.");else await load();}
 async function remove(row:Sender){if(!supabase||!window.confirm(`¿Eliminar remitente ${row.sender_identifier}?`))return;const {error}=await supabase.from("pv_authorized_sms_senders").delete().eq("id",row.id);if(error)setMessage("No se pudo eliminar.");else await load();}
 return <section className="panel"><h2>Remitentes SMS autorizados</h2><p className="muted">Debe coincidir exactamente con el remitente configurado en Android. Para notificaciones de la app de un banco usa el texto «app:paquete» que muestra PayVerify Android (ej: app:com.banco.app). Habilitarlo permite que los eventos estructurados de ese origen se acepten en el backend.</p>
 <form onSubmit={add} style={{display:"grid",gap:10,maxWidth:600}}>
  <label>Identificador exacto<input required maxLength={80} value={sender} onChange={e=>setSender(e.target.value)} style={{display:"block",width:"100%",padding:10}}/></label>
  <label>Nombre del banco<input required maxLength={120} value={bank} onChange={e=>setBank(e.target.value)} style={{display:"block",width:"100%",padding:10}}/></label>
  <label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Habilitado</label>
  <button disabled={busy||!supabase}>{busy?"Guardando…":"Agregar remitente"}</button>
 </form><p role="status">{message}</p>
 {rows.length>0&&<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Remitente","Banco","Estado","Acciones"].map(h=><th key={h} style={{textAlign:"left",padding:10}}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td style={{padding:10}}>{r.sender_identifier}</td><td style={{padding:10}}>{r.bank_name}</td><td style={{padding:10}}>{r.enabled?"Habilitado":"Deshabilitado"}</td><td style={{padding:10}}><button onClick={()=>void toggle(r)}>{r.enabled?"Deshabilitar":"Habilitar"}</button> <button onClick={()=>void remove(r)}>Eliminar</button></td></tr>)}</tbody></table></div>}
 </section>;
}
