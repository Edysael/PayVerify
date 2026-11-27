import { adminClient, cors, out, resolveCaller } from "../_shared/auth.ts";
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return out(405,{error:"method_not_allowed"});
  const ctx=adminClient();if(!ctx)return out(503,{error:"server_not_configured"});
  let b:any;try{b=await req.json();}catch{return out(400,{error:"invalid_json"});}
  if(!b||typeof b!=="object"||Array.isArray(b))return out(400,{error:"invalid_payload"});
  const caller=await resolveCaller(req,ctx,b.organizationId,["owner","admin","operator","viewer"]);if(caller instanceof Response)return caller;
  if(typeof b.externalRef!=="string"||!/^[\w./-]{1,64}$/.test(b.externalRef))return out(400,{error:"invalid_external_ref"});
  const {data:o}=await ctx.admin.from("payverify_orders").select("external_ref,status,amount,expires_at").eq("organization_id",caller.orgId).eq("external_ref",b.externalRef).maybeSingle();
  if(!o)return out(404,{error:"order_not_found"});
  const expired=o.status==="pending"&&new Date(o.expires_at).getTime()<Date.now(),status=expired?"expired":o.status;
  const paymentDetected=status==="paid_probable"||status==="paid_confirmed";
  return out(200,{externalRef:o.external_ref,status,paid:status==="paid_confirmed",paymentDetected,expiresAt:o.expires_at});
});
