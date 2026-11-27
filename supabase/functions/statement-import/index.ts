import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const response=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
const isObj=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null&&!Array.isArray(v);
const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const hex64=(v:unknown)=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
async function sha256(value:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,"0")).join("");}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers});
  if(req.method!=="POST")return response(405,{error:"method_not_allowed"});
  const auth=req.headers.get("Authorization");if(!auth?.startsWith("Bearer "))return response(401,{error:"unauthorized"});
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!service)return response(503,{error:"server_not_configured"});
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userErr}=await userClient.auth.getUser();if(userErr||!user)return response(401,{error:"invalid_session"});
  let body:unknown;try{body=await req.json();}catch{return response(400,{error:"invalid_json"});}
  if(!isObj(body)||!uuid(body.organizationId)||(body.bankAccountId!==undefined&&body.bankAccountId!==null&&!uuid(body.bankAccountId))||!hex64(body.fileHash)||
    typeof body.sourceLabel!=="string"||body.sourceLabel.trim().length<1||body.sourceLabel.length>120||!Array.isArray(body.rows)||body.rows.length<1||body.rows.length>5000)
    return response(400,{error:"invalid_payload"});
  const {data:member}=await admin.from("pv_organization_members").select("role").eq("organization_id",body.organizationId)
    .eq("user_id",user.id).eq("status","active").in("role",["owner","admin","operator"]).maybeSingle();
  if(!member)return response(403,{error:"forbidden"});
  let bankAccountId=typeof body.bankAccountId==="string"?body.bankAccountId:"";
  if(!bankAccountId){
    const {data:accounts,error}=await admin.from("pv_bank_accounts").select("id").eq("organization_id",body.organizationId).eq("status","active").limit(2);
    if(error)return response(500,{error:"bank_account_lookup_failed"});
    if((accounts??[]).length!==1)return response(400,{error:"bank_account_required"});
    bankAccountId=accounts![0].id;
  }
  const {data:account,error:accountErr}=await admin.from("pv_bank_accounts").select("id,currency,status").eq("id",bankAccountId)
    .eq("organization_id",body.organizationId).maybeSingle();
  if(accountErr||!account)return response(404,{error:"bank_account_not_found"});
  if(account.status!=="active")return response(409,{error:"bank_account_inactive"});

  const normalized=[];const occurrenceMap=new Map<string,number>();
  for(const item of body.rows){
    if(!isObj(item)||typeof item.transactionDate!=="string"||item.transactionDate.length>40||typeof item.amount!=="number"||!Number.isFinite(item.amount)||
      typeof item.currency!=="string"||!/^[A-Z]{3}$/.test(item.currency)||item.amount===0||!Number.isFinite(Date.parse(item.transactionDate))||
      (item.reference!=null&&(typeof item.reference!=="string"||item.reference.length>120))||
      (item.description!=null&&(typeof item.description!=="string"||item.description.length>500)))return response(400,{error:"invalid_row"});
    const amount=Number(item.amount), cents=amount*100;
    if(Math.abs(amount)>1_000_000_000_000||!Number.isSafeInteger(Math.round(cents))||Math.abs(cents-Math.round(cents))>1e-7)
      return response(400,{error:"amount_out_of_range_or_precision"});
    if(item.currency!==account.currency)return response(400,{error:"currency_account_mismatch"});
    const reference=typeof item.reference==="string"?item.reference.trim().slice(0,120):null;
    const description=typeof item.description==="string"?item.description.trim()
      .replace(/\b(?:cuenta|account|tarjeta|card)\s*[:#-]?\s*[0-9 -]{6,24}\b/gi,"[redactado]")
      .replace(/\b\d{8,24}\b/g,"[número redactado]").slice(0,160):null;
    const transactionDate=new Date(item.transactionDate).toISOString();
    const base=[bankAccountId,transactionDate,amount.toFixed(2),item.currency,reference??"",description??""].join("|");
    const occurrence=occurrenceMap.get(base)??0;occurrenceMap.set(base,occurrence+1);
    normalized.push({organization_id:body.organizationId,bank_account_id:bankAccountId,transaction_date:transactionDate,amount,currency:item.currency,
      reference,description_redacted:description,line_fingerprint:await sha256(base+"|occurrence:"+occurrence)});
  }

  let batchId:string;
  const {data:existing}=await admin.from("pv_statement_import_batches").select("id,status")
    .eq("organization_id",body.organizationId).eq("bank_account_id",bankAccountId).eq("file_sha256",body.fileHash).maybeSingle();
  if(existing){
    if(!["failed","pending_review"].includes(existing.status))return response(200,{duplicate:true,batch:existing});
    const {data:retry,error}=await admin.from("pv_statement_import_batches").update({uploaded_by:user.id,
      source_label:body.sourceLabel.trim().replace(/\b\d{8,24}\b/g,"[redactado]"),row_count:normalized.length,imported_count:0,rejected_count:0,status:"pending_review"})
      .eq("id",existing.id).in("status",["failed","pending_review"]).select("id").maybeSingle();
    if(error||!retry)return response(409,{error:"import_retry_conflict"});batchId=retry.id;
  }else{
    const {data:batch,error}=await admin.from("pv_statement_import_batches").insert({organization_id:body.organizationId,uploaded_by:user.id,
      source_label:body.sourceLabel.trim().replace(/\b\d{8,24}\b/g,"[redactado]"),bank_account_id:bankAccountId,file_sha256:body.fileHash,
      row_count:normalized.length,status:"pending_review"}).select("id").single();
    if(error||!batch){if(error?.code==="23505")return response(409,{error:"duplicate_or_concurrent_import"});return response(500,{error:"batch_create_failed"});}
    batchId=batch.id;
  }
  const lines=normalized.map(row=>({...row,batch_id:batchId}));
  const {error:lineError}=await admin.from("pv_statement_lines").upsert(lines,{onConflict:"organization_id,line_fingerprint",ignoreDuplicates:true}).select("id");
  if(lineError){await admin.from("pv_statement_import_batches").update({status:"failed",rejected_count:normalized.length}).eq("id",batchId);return response(500,{error:"statement_rows_persist_failed"});}
  const {count,error:countError}=await admin.from("pv_statement_lines").select("id",{count:"exact",head:true}).eq("batch_id",batchId);
  if(countError){await admin.from("pv_statement_import_batches").update({status:"failed"}).eq("id",batchId);return response(500,{error:"statement_batch_count_failed"});}
  const imported=count??0,skipped=Math.max(0,normalized.length-imported);
  const {error:finishError}=await admin.from("pv_statement_import_batches").update({status:"validated",imported_count:imported,rejected_count:skipped,row_count:normalized.length}).eq("id",batchId);
  if(finishError){await admin.from("pv_statement_import_batches").update({status:"failed"}).eq("id",batchId);return response(500,{error:"statement_batch_finalize_failed"});}
  await admin.from("pv_audit_logs").insert({organization_id:body.organizationId,user_id:user.id,action:"statement_batch_imported",entity_type:"statement_import_batch",entity_id:batchId});
  return response(201,{ok:true,batchId,imported,skippedDuplicates:skipped});
});
