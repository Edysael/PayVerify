import {createClient} from "https://esm.sh/@supabase/supabase-js@2.49.1";
// Latido del teléfono lector: confirma que el dispositivo aprobado sigue conectado y si está escuchando pagos.
// Mismas comprobaciones que payment-event-ingest: sesión del usuario, membresía operativa y dispositivo propio.
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
 if(!uuid(b.organizationId)||!uuid(b.deviceId)||typeof b.captureActive!=="boolean")return out(400,{error:"invalid_payload"});
 const appVersion=typeof b.appVersion==="string"&&/^[\w.+-]{1,32}$/.test(b.appVersion)?b.appVersion:null;
 const battery=typeof b.batteryUnrestricted==="boolean"?b.batteryUnrestricted:null;
 const {data:member}=await admin.from("pv_organization_members").select("id").eq("organization_id",b.organizationId).eq("user_id",user.id).eq("status","active").in("role",["owner","admin","operator"]).maybeSingle();
 if(!member)return out(403,{error:"organization_access_denied"});
 const {data:device}=await admin.from("pv_devices").select("id,device_status").eq("id",b.deviceId).eq("organization_id",b.organizationId).eq("user_id",user.id).maybeSingle();
 if(!device||device.device_status==="revoked")return out(403,{error:"device_not_active_or_not_owned"});
 if(device.device_status!=="active")return out(425,{error:"device_pending_approval"});
 const now=new Date().toISOString();
 const {error:updErr}=await admin.from("pv_devices").update({last_heartbeat_at:now,last_seen_at:now,capture_active:b.captureActive,app_version:appVersion,battery_unrestricted:battery}).eq("id",device.id);
 if(updErr)return out(500,{error:"heartbeat_failed"});
 return out(200,{ok:true,serverTime:now,deviceStatus:"active"});
});
