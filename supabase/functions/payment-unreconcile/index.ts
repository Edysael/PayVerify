import {createClient} from "https://esm.sh/@supabase/supabase-js@2.49.1";
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
 if(!uuid(b?.lineId))return out(400,{error:"invalid_line"});
 const {data:line}=await admin.from("pv_statement_lines").select("organization_id").eq("id",b.lineId).maybeSingle();
 if(!line)return out(404,{error:"not_found"});
 const {data:member}=await admin.from("pv_organization_members").select("role").eq("organization_id",line.organization_id).eq("user_id",user.id).eq("status","active").in("role",["owner","admin","operator"]).maybeSingle();
 if(!member)return out(403,{error:"forbidden"});
 const {data,error:rpcError}=await admin.rpc("payverify_unreconcile_statement_line",{p_line_id:b.lineId,p_user_id:user.id});
 if(rpcError){const known=["forbidden","not_found","not_reconciled"];const code=known.find(c=>rpcError.message.includes(c));return out(code==="forbidden"?403:code==="not_found"?404:code?409:500,{error:code??"unreconcile_failed"});}
 return out(200,data);
});
