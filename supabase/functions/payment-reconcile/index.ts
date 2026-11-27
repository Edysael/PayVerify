import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const response=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers});
  if(req.method!=="POST") return response(405,{error:"method_not_allowed"});
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer ")) return response(401,{error:"unauthorized"});
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!service) return response(503,{error:"server_not_configured"});
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await userClient.auth.getUser();
  if(error||!user) return response(401,{error:"invalid_session"});
  let body:unknown; try{body=await req.json();}catch{return response(400,{error:"invalid_json"});}
  if(!body||typeof body!=="object"||!uuid((body as any).lineId)||!uuid((body as any).paymentId)) return response(400,{error:"invalid_payload"});
  const {data:line}=await admin.from("pv_statement_lines").select("organization_id").eq("id",(body as any).lineId).maybeSingle();
  if(!line) return response(404,{error:"statement_line_not_found"});
  const {data:member}=await admin.from("pv_organization_members").select("role").eq("organization_id",line.organization_id)
    .eq("user_id",user.id).eq("status","active").in("role",["owner","admin","operator"]).maybeSingle();
  if(!member) return response(403,{error:"forbidden"});
  const {data,error:rpcError}=await admin.rpc("payverify_reconcile_statement_line",{
    p_line_id:(body as any).lineId,p_payment_id:(body as any).paymentId,p_user_id:user.id,p_tolerance_minutes:2880
  });
  if(rpcError) {
    // payment_not_reconcilable y bank_account_mismatch se agregan con la migración 0009.
    const known=["forbidden","not_found","organization_mismatch","already_reconciled","amount_mismatch","currency_mismatch","reference_mismatch","date_outside_tolerance","invalid_tolerance","payment_not_reconcilable","bank_account_mismatch"];
    const code=known.find(c=>rpcError.message.includes(c));
    return response(code==="forbidden"?403:code==="not_found"?404:code?409:500,{error:code??"reconciliation_failed"});
  }
  return response(200,data);
});
