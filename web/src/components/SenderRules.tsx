"use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
type BankAccount={id:string;bank_name:string;account_alias:string;account_type:string|null;currency:string;status:string};
type Sender={id:string;sender_identifier:string;bank_name:string;enabled:boolean;bank_account_id:string|null};
export default function SenderRules({organizationId}:{organizationId:string}){
 const [accounts,setAccounts]=useState<BankAccount[]>([]);const [bank,setBank]=useState("");const [alias,setAlias]=useState("");const [accountType,setAccountType]=useState("checking");
 const [sender,setSender]=useState("");const [accountId,setAccountId]=useState("");const [enabled,setEnabled]=useState(true);
 const [rows,setRows]=useState<Sender[]>([]);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function load(){
  if(!supabase){setMessage("Supabase no está configurado.");return;}
  try{
   const [a,s]=await Promise.all([
    supabase.from("pv_bank_accounts").select("id,bank_name,account_alias,account_type,currency,status").eq("organization_id",organizationId).order("created_at",{ascending:false}),
    supabase.from("pv_authorized_sms_senders").select("id,sender_identifier,bank_name,enabled,bank_account_id").eq("organization_id",organizationId).order("created_at",{ascending:false})
   ]);
   if(a.error||s.error){setMessage("No se pudieron cargar cuentas y remitentes. Verifica sesión y permisos.");return;}
   const all=a.data??[],active=all.filter(x=>x.status==="active");setAccounts(all);
   setAccountId(current=>current&&active.some(x=>x.id===current)?current:active[0]?.id??"");setRows(s.data??[]);
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudieron cargar los datos.");}
 }
 useEffect(()=>{void load();},[organizationId]);
 async function addAccount(e:React.FormEvent){
  e.preventDefault();if(!supabase)return;const b=bank.trim(),a=alias.trim();
  if(b.length<2||b.length>120||a.length<2||a.length>120){setMessage("Banco y alias deben tener entre 2 y 120 caracteres.");return;}
  setBusy(true);setMessage("");
  try{const {error}=await supabase.from("pv_bank_accounts").insert({organization_id:organizationId,bank_name:b,account_alias:a,account_type:accountType,currency:"VES",status:"active"});
   if(error){setMessage("No se pudo guardar la cuenta. Verifica tu rol.");return;}setBank("");setAlias("");await load();setMessage("Cuenta bancaria agregada.");
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo guardar la cuenta.");}finally{setBusy(false);}
 }
 async function add(e:React.FormEvent){
  e.preventDefault();if(!supabase)return;const clean=sender.trim(),a=accounts.find(x=>x.id===accountId&&x.status==="active");
  if(!a){setMessage("Selecciona una cuenta bancaria activa.");return;}if(!clean||clean.length>80){setMessage("Identificador exacto: máximo 80 caracteres.");return;}
  setBusy(true);setMessage("");
  try{const {error}=await supabase.from("pv_authorized_sms_senders").insert({organization_id:organizationId,bank_account_id:a.id,sender_identifier:clean,bank_name:a.bank_name,enabled});
   if(error){setMessage("No se pudo guardar. Verifica duplicados y permisos.");return;}setSender("");await load();setMessage("Remitente agregado y vinculado a la cuenta.");
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo guardar.");}finally{setBusy(false);}
 }
 async function linkAccount(row:Sender,id:string){
  if(!supabase||!id)return;const a=accounts.find(x=>x.id===id&&x.status==="active");if(!a)return;setBusy(true);setMessage("");
  try{const {error}=await supabase.from("pv_authorized_sms_senders").update({bank_account_id:a.id,bank_name:a.bank_name}).eq("id",row.id).eq("organization_id",organizationId);
   if(error){setMessage("No se pudo vincular la cuenta.");return;}await load();setMessage("Cuenta vinculada al remitente.");
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo vincular.");}finally{setBusy(false);}
 }
 async function toggle(row:Sender){
  if(!supabase)return;setBusy(true);setMessage("");
  try{const {error}=await supabase.from("pv_authorized_sms_senders").update({enabled:!row.enabled}).eq("id",row.id).eq("organization_id",organizationId);
   if(error){setMessage("No se pudo cambiar el estado.");return;}await load();setMessage(row.enabled?"Remitente deshabilitado.":"Remitente habilitado.");
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo cambiar.");}finally{setBusy(false);}
 }
 async function remove(row:Sender){
  if(!supabase||!window.confirm("¿Eliminar remitente "+row.sender_identifier+"?"))return;setBusy(true);setMessage("");
  try{const {error}=await supabase.from("pv_authorized_sms_senders").delete().eq("id",row.id).eq("organization_id",organizationId);
   if(error){setMessage("No se pudo eliminar.");return;}await load();setMessage("Remitente eliminado.");
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo eliminar.");}finally{setBusy(false);}
 }
 return <>
 <section className="panel"><h2>Cuentas bancarias</h2><p className="muted">Registra la cuenta donde recibes pagos. Los remitentes y extractos se vinculan a una cuenta específica. No se solicitan credenciales bancarias.</p>
 <form onSubmit={addAccount} style={{display:"grid",gap:10,maxWidth:600}}>
  <label>Banco<input required minLength={2} maxLength={120} value={bank} disabled={busy} onChange={e=>setBank(e.target.value)} style={{display:"block",width:"100%",padding:10}}/></label>
  <label>Alias<input required minLength={2} maxLength={120} value={alias} disabled={busy} onChange={e=>setAlias(e.target.value)} placeholder="Cuenta principal" style={{display:"block",width:"100%",padding:10}}/></label>
  <label>Tipo<select value={accountType} disabled={busy} onChange={e=>setAccountType(e.target.value)} style={{display:"block",width:"100%",padding:10}}><option value="checking">Corriente</option><option value="savings">Ahorro</option><option value="other">Otra</option></select></label>
  <label>Moneda<select value="VES" disabled style={{display:"block",width:"100%",padding:10}}><option value="VES">VES</option></select></label>
  <button disabled={busy||!supabase}>{busy?"Guardando…":"Agregar cuenta bancaria"}</button>
 </form>
 {accounts.length>0&&<div style={{overflowX:"auto",marginTop:16}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Banco","Alias","Moneda","Estado"].map(h=><th key={h} style={{textAlign:"left",padding:10}}>{h}</th>)}</tr></thead><tbody>{accounts.map(a=><tr key={a.id}><td style={{padding:10}}>{a.bank_name}</td><td style={{padding:10}}>{a.account_alias}</td><td style={{padding:10}}>{a.currency}</td><td style={{padding:10}}>{a.status}</td></tr>)}</tbody></table></div>}
 </section>
 <section className="panel"><h2>Remitentes autorizados</h2><p className="muted">Debe coincidir exactamente con el remitente SMS o identificador de notificación. Para apps bancarias usa «app:paquete» que muestra PayVerify Android. Vincula cada origen a la cuenta donde recibe pagos.</p>
 <form onSubmit={add} style={{display:"grid",gap:10,maxWidth:600}}>
  <label>Cuenta bancaria<select required value={accountId} disabled={busy} onChange={e=>setAccountId(e.target.value)} style={{display:"block",width:"100%",padding:10}}>
   <option value="">Selecciona una cuenta</option>{accounts.filter(a=>a.status==="active").map(a=><option key={a.id} value={a.id}>{a.bank_name+" · "+a.account_alias+" · "+a.currency}</option>)}
  </select></label>
  <label>Identificador exacto<input required maxLength={80} value={sender} disabled={busy} onChange={e=>setSender(e.target.value)} style={{display:"block",width:"100%",padding:10}}/></label>
  <label><input type="checkbox" checked={enabled} disabled={busy} onChange={e=>setEnabled(e.target.checked)}/> Habilitado</label>
  <button disabled={busy||!supabase||!accountId}>{busy?"Procesando…":"Agregar remitente"}</button>
 </form><p role="status">{message}</p>
 {rows.length>0&&<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Remitente","Banco","Cuenta","Estado","Acciones"].map(h=><th key={h} style={{textAlign:"left",padding:10}}>{h}</th>)}</tr></thead><tbody>{rows.map(r=>{const a=accounts.find(x=>x.id===r.bank_account_id);return <tr key={r.id}>
  <td style={{padding:10}}>{r.sender_identifier}</td><td style={{padding:10}}>{r.bank_name}</td>
  <td style={{padding:10}}><select aria-label={"Cuenta de "+r.sender_identifier} value={r.bank_account_id??""} disabled={busy} onChange={e=>void linkAccount(r,e.target.value)}><option value="">Vincular cuenta…</option>{accounts.filter(x=>x.status==="active").map(x=><option key={x.id} value={x.id}>{x.account_alias+" ("+x.currency+")"}</option>)}</select>{!a&&<small style={{display:"block"}}>Sin cuenta vinculada</small>}</td>
  <td style={{padding:10}}>{r.enabled?"Habilitado":"Deshabilitado"}</td><td style={{padding:10}}><button disabled={busy} onClick={()=>void toggle(r)}>{r.enabled?"Deshabilitar":"Habilitar"}</button> <button disabled={busy} onClick={()=>void remove(r)}>Eliminar</button></td>
 </tr>;})}</tbody></table></div>}
 </section></>;
}
