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
 if(!uuid(b?.organizationId)||typeof b?.deviceName!=="string"||b.deviceName.trim().length<1||b.deviceName.length>100)return out(400,{error:"invalid_payload"});
 const {data:member}=await admin.from("pv_organization_members").select("id").eq("organization_id",b.organizationId).eq("user_id",user.id).eq("status","active").in("role",["owner","admin","operator"]).maybeSingle();
 if(!member)return out(403,{error:"forbidden"});
 const {data:device,error:deviceErr}=await admin.from("pv_devices").insert({organization_id:b.organizationId,user_id:user.id,device_name:b.deviceName.trim(),platform:"android",device_status:"pending"}).select("id,device_status").single();
 if(deviceErr||!device)return out(500,{error:"device_enroll_failed"});
 await admin.from("pv_audit_logs").insert({organization_id:b.organizationId,user_id:user.id,action:"device_enrollment_requested",entity_type:"device",entity_id:device.id});
 return out(201,{deviceId:device.id,status:device.device_status});
});
