"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {parseStatementCsv,sha256Hex} from "../lib/statement-csv";
import {supabase} from "../lib/supabase";
type BankAccount={id:string;bank_name:string;account_alias:string;currency:string;status:string};
export default function StatementImport({organizationId}:{organizationId:string}){
 const router=useRouter();const [accounts,setAccounts]=useState<BankAccount[]>([]);const [bankAccountId,setBankAccountId]=useState("");const [accountError,setAccountError]=useState("");
 const [file,setFile]=useState<File|null>(null);const [rows,setRows]=useState<ReturnType<typeof parseStatementCsv>["rows"]>([]);
 const [errors,setErrors]=useState<string[]>([]);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 useEffect(()=>{let cancelled=false;async function load(){
  if(!supabase){setAccountError("Supabase no está configurado.");return;}
  const {data,error}=await supabase.from("pv_bank_accounts").select("id,bank_name,account_alias,currency,status").eq("organization_id",organizationId).eq("status","active").order("bank_name");
  if(cancelled)return;if(error){setAccountError("No se pudieron cargar las cuentas bancarias.");return;}
  const active=data??[];setAccounts(active);setBankAccountId(current=>current&&active.some(a=>a.id===current)?current:active[0]?.id??"");
  setAccountError(active.length?"":"Primero registra una cuenta bancaria activa en Configuración de remitentes.");
 }void load();return()=>{cancelled=true;};},[organizationId]);
 async function inspect(selected:File|null){setFile(selected);setRows([]);setErrors([]);setMessage("");if(!selected)return;
  if(selected.size>2*1024*1024){setErrors(["Archivo mayor a 2 MB."]);setFile(null);return;}
  try{const parsed=parseStatementCsv(await selected.text());setRows(parsed.rows);setErrors(parsed.errors);if(parsed.rows.length)setMessage(parsed.rows.length+" filas válidas para vista previa.");else if(!parsed.errors.length)setMessage("El archivo no contiene filas válidas.");}
  catch(e){setFile(null);setErrors([e instanceof Error?e.message:"No se pudo leer el CSV."]);}
 }
 async function importRows(){if(!supabase||!file||!rows.length||errors.length||!bankAccountId)return;setBusy(true);setMessage("");
  try{const fileHash=await sha256Hex(file);const {data,error}=await supabase.functions.invoke("statement-import",{body:{organizationId,bankAccountId,fileHash,sourceLabel:file.name,rows}});
   if(error)throw new Error(error.message);if(data?.ok===false)throw new Error(data?.message??"La importación fue rechazada.");
   setMessage(data?.duplicate?"Este archivo ya se había importado.":"Importación procesada: "+(data?.imported??0)+" filas; duplicadas omitidas: "+(data?.skippedDuplicates??0)+".");router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo importar.");}finally{setBusy(false);}
 }
 return <section className="panel"><h2>Importar extracto CSV</h2><p className="muted">CSV de movimientos, máximo 2 MB y 5.000 filas. Se requiere Fecha y Monto. Revisa la vista previa antes de importar.</p>
  <label>Cuenta bancaria del extracto<select value={bankAccountId} disabled={!accounts.length||busy} onChange={e=>setBankAccountId(e.target.value)} style={{display:"block",width:"100%",maxWidth:520,padding:10,marginTop:6}}>
   {accounts.map(a=><option key={a.id} value={a.id}>{a.bank_name+" · "+a.account_alias+" · "+a.currency}</option>)}</select></label>
  {accountError&&<p role="status" className="muted">{accountError}</p>}
  <input type="file" accept=".csv,text/csv" disabled={busy||!bankAccountId} onChange={e=>void inspect(e.target.files?.[0]??null)}/>
  {rows.length>0&&<div style={{overflowX:"auto",marginTop:16}}><p><strong>Vista previa ({rows.length} filas válidas)</strong></p><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Fecha","Monto","Moneda","Referencia"].map(h=><th key={h} style={{textAlign:"left",padding:8}}>{h}</th>)}</tr></thead>
   <tbody>{rows.slice(0,8).map((r,i)=><tr key={i}><td style={{padding:8}}>{r.transactionDate}</td><td style={{padding:8}}>{r.amount.toFixed(2)}</td><td style={{padding:8}}>{r.currency}</td><td style={{padding:8}}>{r.reference??"—"}</td></tr>)}</tbody></table></div>}
  {errors.length>0&&<div role="alert" className="panel"><strong>Corrige los errores antes de importar</strong><ul>{errors.slice(0,20).map((e,i)=><li key={i}>{e}</li>)}</ul></div>}
  <button disabled={busy||!file||!rows.length||errors.length>0||!supabase||!bankAccountId} onClick={()=>void importRows()} style={{padding:"10px 16px",marginTop:12}}>{busy?"Importando…":"Confirmar importación"}</button><p role="status">{message}</p>
 </section>;
}
