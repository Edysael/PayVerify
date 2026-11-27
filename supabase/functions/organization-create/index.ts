import {createClient} from "https://esm.sh/@supabase/supabase-js@2.49.1";
const h={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const out=(s:number,b:unknown)=>new Response(JSON.stringify(b),{status:s,headers:h});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:h});
 if(req.method!=="POST")return out(405,{error:"method_not_allowed"});
 const auth=req.headers.get("Authorization");if(!auth?.startsWith("Bearer "))return out(401,{error:"unauthorized"});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return out(503,{error:"server_not_configured"});
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}}),admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await userClient.auth.getUser();if(error||!user)return out(401,{error:"invalid_session"});
 let b:any;try{b=await req.json()}catch{return out(400,{error:"invalid_json"})}
 if(typeof b?.name!=="string"||b.name.trim().length<2||b.name.trim().length>160)return out(400,{error:"invalid_name"});
 const {data:org,error:orgErr}=await admin.from("pv_organizations").insert({name:b.name.trim()}).select("id,name").single();
 if(orgErr||!org)return out(500,{error:"organization_create_failed"});
 const {error:memberErr}=await admin.from("pv_organization_members").insert({organization_id:org.id,user_id:user.id,role:"owner",status:"active"});
 if(memberErr){await admin.from("pv_organizations").delete().eq("id",org.id);return out(500,{error:"owner_membership_failed"});}
 await admin.from("pv_audit_logs").insert({organization_id:org.id,user_id:user.id,action:"organization_created",entity_type:"organization",entity_id:org.id});
 return out(201,{organization:org});
});
