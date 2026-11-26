"use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
type Sender={id:string;sender_identifier:string;bank_name:string;enabled:boolean};
export default function SenderRules({organizationId}:{organizationId:string}){
 const [sender,setSender]=useState("");const [bank,setBank]=useState("");const [enabled,setEnabled]=useState(true);
 const [rows,setRows]=useState<Sender[]>([]);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function load(){
  if(!supabase){setMessage("Supabase no está configurado.");return;}
  try{
   const {data,error}=await supabase.from("pv_authorized_sms_senders").select("id,sender_identifier,bank_name,enabled").eq("organization_id",organizationId).order("created_at",{ascending:false});
   if(error){setMessage("No se pudieron cargar remitentes. Verifica sesión y permisos.");return;}
   setRows(data??[]);
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudieron cargar remitentes.");}
 }
 useEffect(()=>{void load();},[organizationId]);
 async function add(e:React.FormEvent){
  e.preventDefault();if(!supabase){setMessage("Supabase no está configurado.");return;}
  const cleanSender=sender.trim(),cleanBank=bank.trim();
  if(!cleanSender||cleanSender.length>80){setMessage("Escribe un identificador exacto de hasta 80 caracteres.");return;}
  if(!cleanBank||cleanBank.length>120){setMessage("Escribe el nombre del banco (máximo 120 caracteres).");return;}
  setBusy(true);setMessage("");
  try{
   const {error}=await supabase.from("pv_authorized_sms_senders").insert({organization_id:organizationId,sender_identifier:cleanSender,bank_name:cleanBank,enabled});
   if(error){setMessage("No se pudo guardar. Verifica duplicados y que tu rol permita administrar remitentes.");return;}
   setSender("");setBank("");await load();setMessage("Remitente agregado.");
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo guardar el remitente.");}
  finally{setBusy(false);}
 }
 async function toggle(row:Sender){
  if(!supabase)return;setBusy(true);setMessage("");
  try{
   const {error}=await supabase.from("pv_authorized_sms_senders").update({enabled:!row.enabled}).eq("id",row.id).eq("organization_id",organizationId);
   if(error){setMessage("No se pudo cambiar el estado.");return;}
   await load();setMessage(row.enabled?"Remitente deshabilitado.":"Remitente habilitado.");
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo cambiar el estado.");}
  finally{setBusy(false);}
 }
 async function remove(row:Sender){
  if(!supabase||!window.confirm(`¿Eliminar remitente ${row.sender_identifier}?`))return;
  setBusy(true);setMessage("");
  try{
   const {error}=await supabase.from("pv_authorized_sms_senders").delete().eq("id",row.id).eq("organization_id",organizationId);
   if(error){setMessage("No se pudo eliminar el remitente.");return;}
   await load();setMessage("Remitente eliminado.");
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo eliminar.");}
  finally{setBusy(false);}
 }
 return <section className="panel"><h2>Remitentes SMS autorizados</h2><p className="muted">Debe coincidir exactamente con el remitente configurado en Android. Para notificaciones de la app de un banco usa el texto «app:paquete» que muestra PayVerify Android (ej: app:com.banco.app). Habilitarlo permite que los eventos estructurados de ese origen se acepten en el backend.</p>
 <form onSubmit={add} style={{display:"grid",gap:10,maxWidth:600}}>
  <label>Identificador exacto<input required maxLength={80} value={sender} disabled={busy} onChange={e=>setSender(e.target.value)} style={{display:"block",width:"100%",padding:10}}/></label>
  <label>Nombre del banco<input required maxLength={120} value={bank} disabled={busy} onChange={e=>setBank(e.target.value)} style={{display:"block",width:"100%",padding:10}}/></label>
  <label><input type="checkbox" checked={enabled} disabled={busy} onChange={e=>setEnabled(e.target.checked)}/> Habilitado</label>
  <button disabled={busy||!supabase}>{busy?"Procesando…":"Agregar remitente"}</button>
 </form><p role="status">{message}</p>
 {rows.length>0&&<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Remitente","Banco","Estado","Acciones"].map(h=><th key={h} style={{textAlign:"left",padding:10}}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td style={{padding:10}}>{r.sender_identifier}</td><td style={{padding:10}}>{r.bank_name}</td><td style={{padding:10}}>{r.enabled?"Habilitado":"Deshabilitado"}</td><td style={{padding:10}}><button disabled={busy} onClick={()=>void toggle(r)}>{r.enabled?"Deshabilitar":"Habilitar"}</button> <button disabled={busy} onClick={()=>void remove(r)}>Eliminar</button></td></tr>)}</tbody></table></div>}
 </section>;
}
