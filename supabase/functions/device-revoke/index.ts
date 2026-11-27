import {createClient} from "https://esm.sh/@supabase/supabase-js@2.119.2";
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
 if(!uuid(b?.deviceId))return out(400,{error:"invalid_device"});
 const {data:device}=await admin.from("pv_devices").select("id,organization_id,device_status").eq("id",b.deviceId).maybeSingle();
 if(!device)return out(404,{error:"device_not_found"});
 const {data:member}=await admin.from("pv_organization_members").select("role").eq("organization_id",device.organization_id).eq("user_id",user.id).eq("status","active").in("role",["owner","admin"]).maybeSingle();
 if(!member)return out(403,{error:"forbidden"});
 if(device.device_status!=="active")return out(409,{error:"device_not_active"});
 const {data:updated,error:updateError}=await admin.from("pv_devices").update({device_status:"revoked",revoked_at:new Date().toISOString()}).eq("id",device.id).eq("device_status","active").select("id").maybeSingle();
 if(updateError)return out(500,{error:"device_revoke_failed"});
 if(!updated)return out(409,{error:"device_not_active"});
 await admin.from("pv_audit_logs").insert({organization_id:device.organization_id,user_id:user.id,action:"device_revoked",entity_type:"device",entity_id:device.id});
 return out(200,{ok:true,deviceId:device.id,status:"revoked"});
});
