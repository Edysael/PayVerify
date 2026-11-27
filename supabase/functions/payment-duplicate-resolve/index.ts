import {createClient} from "https://esm.sh/@supabase/supabase-js@2.49.1";
// Resuelve a mano un pago POSSIBLE_DUPLICATE: decision "not_duplicate" (vuelve al flujo normal) o "duplicate" (REJECTED).
// Requiere la migración 0011 (payverify_resolve_duplicate).
const h={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const out=(s:number,b:unknown)=>new Response(JSON.stringify(b),{status:s,headers:h});
const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:h});
 if(req.method!=="POST")return out(405,{error:"method_not_allowed"});
 const auth=req.headers.get("Authorization");if(!auth?.startsWith("Bearer "))return out(401,{error:"unauthorized"});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return out(503,{error:"server_not_configured"});
 const uc=createClient(url,anon,{global:{headers:{Authorization:auth}}}),admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await uc.auth.getUser();if(error||!user)return out(401,{error:"invalid_session"});
 let b:any;try{b=await req.json()}catch{return out(400,{error:"invalid_json"})}
 if(!b||typeof b!=="object"||Array.isArray(b))return out(400,{error:"invalid_json"});
 if(!uuid(b.paymentId))return out(400,{error:"invalid_payment"});
 if(b.decision!=="not_duplicate"&&b.decision!=="duplicate")return out(400,{error:"invalid_decision"});
 const {data,error:rpcError}=await admin.rpc("payverify_resolve_duplicate",{p_payment_id:b.paymentId,p_user_id:user.id,p_decision:b.decision});
 if(rpcError){
  const map:Record<string,number>={forbidden:403,payment_not_found:404,not_possible_duplicate:409,invalid_decision:400};
  const code=Object.keys(map).find(k=>rpcError.message?.includes(k));
  return out(code?map[code]:500,{error:code??"duplicate_resolve_failed"});
 }
 return out(200,data);
});
