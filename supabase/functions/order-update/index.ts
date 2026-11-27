import { adminClient, cors, out, resolveCaller } from "../_shared/auth.ts";
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return out(405,{error:"method_not_allowed"});
  const ctx=adminClient();if(!ctx)return out(503,{error:"server_not_configured"});
  let b:any;try{b=await req.json();}catch{return out(400,{error:"invalid_json"});}
  if(!b||typeof b!=="object"||Array.isArray(b))return out(400,{error:"invalid_payload"});
  const caller=await resolveCaller(req,ctx,b.organizationId);if(caller instanceof Response)return caller;
  if(typeof b.externalRef!=="string"||!/^[\w./-]{1,64}$/.test(b.externalRef))return out(400,{error:"invalid_external_ref"});
  if(b.customerPhoneLast4!=null&&(typeof b.customerPhoneLast4!=="string"||!/^[0-9]{4}$/.test(b.customerPhoneLast4.trim())))return out(400,{error:"invalid_phone"});
  if(b.referenceTail!=null&&(typeof b.referenceTail!=="string"||!/^[A-Z0-9]{4,12}$/i.test(b.referenceTail.trim())))return out(400,{error:"invalid_reference_tail"});
  const {data:order}=await ctx.admin.from("payverify_orders").select("id").eq("organization_id",caller.orgId).eq("external_ref",b.externalRef).maybeSingle();
  if(!order)return out(404,{error:"order_not_found"});
  const {data:allowed,error:limitError}=await ctx.admin.rpc("payverify_order_hint_rate_limit",{p_order_id:order.id,p_max_attempts:10,p_window_seconds:600});
  if(limitError)return out(500,{error:"hint_rate_limit_unavailable"});
  if(!allowed)return new Response(JSON.stringify({error:"rate_limited"}),{status:429,headers:{...cors,"Retry-After":"600"}});
  const {data,error}=await ctx.admin.rpc("payverify_order_set_hints",{p_order_id:order.id,
    p_phone_last4:b.customerPhoneLast4?b.customerPhoneLast4.trim():null,p_reference_tail:b.referenceTail?b.referenceTail.trim().toUpperCase():null});
  if(error){const known=["invalid_reference_tail","invalid_phone","invalid_state"];const code=known.find(k=>error.message?.includes(k));
    return out(code==="invalid_state"?409:code?400:500,{error:code??"order_update_failed"});}
  return out(200,{orderId:data.id,status:data.status,matchMethod:data.match_method});
});
