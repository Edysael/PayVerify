import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const response=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
const isObj=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null&&!Array.isArray(v);
const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const hex64=(v:unknown)=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);

async function sha256(value:string) {
  const data=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest("SHA-256",data);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers});
  if(req.method!=="POST") return response(405,{error:"method_not_allowed"});
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer ")) return response(401,{error:"unauthorized"});
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!service) return response(503,{error:"server_not_configured"});
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userErr}=await userClient.auth.getUser();
  if(userErr||!user) return response(401,{error:"invalid_session"});
  let body:unknown; try{body=await req.json();}catch{return response(400,{error:"invalid_json"});}
  if(!isObj(body)||!uuid(body.organizationId)||!hex64(body.fileHash)||
    typeof body.sourceLabel!=="string"||body.sourceLabel.trim().length<1||body.sourceLabel.length>120||
    !Array.isArray(body.rows)||body.rows.length<1||body.rows.length>5000) return response(400,{error:"invalid_payload"});
  const {data:member}=await admin.from("pv_organization_members").select("role")
    .eq("organization_id",body.organizationId).eq("user_id",user.id).eq("status","active")
    .in("role",["owner","admin","operator"]).maybeSingle();
  if(!member) return response(403,{error:"forbidden"});

  const {data:existing}=await admin.from("pv_statement_import_batches").select("id,status,row_count,imported_count")
    .eq("organization_id",body.organizationId).eq("file_sha256",body.fileHash).maybeSingle();
  if(existing) return response(200,{duplicate:true,batch:existing});

  const normalized=[];
  for(const item of body.rows) {
    if(!isObj(item)||typeof item.transactionDate!=="string"||!Number.isFinite(item.amount)||
      typeof item.currency!=="string"||!/^[A-Z]{3}$/.test(item.currency)||item.amount===0||
      !Number.isFinite(Date.parse(item.transactionDate))) return response(400,{error:"invalid_row"});
    const amount=Number(item.amount);
    if(Math.abs(amount)>1_000_000_000_000) return response(400,{error:"amount_out_of_range"});
    const reference=typeof item.reference==="string"?item.reference.trim().slice(0,120):null;
    const description=typeof item.description==="string"
      ? item.description.trim()
        .replace(/\b(?:cuenta|account|tarjeta|card)\s*[:#-]?\s*[0-9 -]{6,24}\b/gi,"[redactado]")
        .replace(/\b\d{8,24}\b/g,"[número redactado]").slice(0,160)
      : null;
    const canonical=[new Date(item.transactionDate).toISOString(),amount.toFixed(2),item.currency,reference??"",description??""].join("|");
    normalized.push({
      organization_id:body.organizationId,
      transaction_date:new Date(item.transactionDate).toISOString(),
      amount,currency:item.currency,reference,description_redacted:description,
      line_fingerprint:await sha256(canonical),
    });
  }
  const {data:batch,error:batchErr}=await admin.from("pv_statement_import_batches").insert({
    organization_id:body.organizationId,uploaded_by:user.id,source_label:body.sourceLabel.trim(),
    file_sha256:body.fileHash,row_count:normalized.length,status:"pending_review"
  }).select("id").single();
  if(batchErr||!batch) {
    if(batchErr?.code==="23505") return response(409,{error:"duplicate_or_concurrent_import"});
    return response(500,{error:"batch_create_failed"});
  }
  const lines=normalized.map(row=>({...row,batch_id:batch.id}));
  const {data:inserted,error:linesErr}=await admin.from("pv_statement_lines").insert(lines).select("id");
  if(linesErr) {
    await admin.from("pv_statement_import_batches").update({status:"failed",rejected_count:normalized.length}).eq("id",batch.id);
    return response(500,{error:"statement_rows_persist_failed"});
  }
  await admin.from("pv_statement_import_batches").update({status:"validated",imported_count:inserted?.length??0}).eq("id",batch.id);
  await admin.from("pv_audit_logs").insert({organization_id:body.organizationId,user_id:user.id,action:"statement_batch_imported",entity_type:"statement_import_batch",entity_id:batch.id});
  return response(201,{ok:true,batchId:batch.id,imported:inserted?.length??0});
});
