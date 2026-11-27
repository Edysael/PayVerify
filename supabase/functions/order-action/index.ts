import { adminClient, cors, isUuid, out, resolveCaller } from "../_shared/auth.ts";
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return out(405,{error:"method_not_allowed"});
  const ctx=adminClient();if(!ctx)return out(503,{error:"server_not_configured"});
  if(req.headers.get("x-payverify-key"))return out(403,{error:"session_required"});
  let b:any;try{b=await req.json();}catch{return out(400,{error:"invalid_json"});}
  if(!b||typeof b!=="object"||Array.isArray(b))return out(400,{error:"invalid_payload"});
  const caller=await resolveCaller(req,ctx,b.organizationId);if(caller instanceof Response)return caller;
  if(!isUuid(b.orderId))return out(400,{error:"invalid_order"});
  if(!["approve","reject_match","link","cancel"].includes(b.action))return out(400,{error:"invalid_action"});
  if(b.action==="link"&&!isUuid(b.paymentId))return out(400,{error:"invalid_payment"});
  const {data:order}=await ctx.admin.from("payverify_orders").select("id").eq("id",b.orderId).eq("organization_id",caller.orgId).maybeSingle();
  if(!order)return out(404,{error:"order_not_found"});
  const {data,error}=await ctx.admin.rpc("payverify_order_action",{p_order_id:b.orderId,p_user_id:caller.userId,p_action:b.action,p_payment_id:b.paymentId??null});
  if(error){const map:Record<string,number>={forbidden:403,invalid_state:409,amount_mismatch:409,currency_mismatch:409,payment_already_linked:409,
    payment_not_linkable:409,bank_account_mismatch:409,bank_account_not_active_or_wrong_org:409,payment_not_found:404,order_not_found:404,payment_required:400};
    const code=Object.keys(map).find(k=>error.message?.includes(k));return out(code?map[code]:500,{error:code??"order_action_failed"});}
  return out(200,{ok:true,order:data});
});
