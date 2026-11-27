// payment-duplicate-resolve: validación de entrada y mapeo de errores del RPC (cliente simulado).
import assert from 'node:assert/strict';
let handler, next={data:{ok:true,status:'RECEIVED_BY_SERVER'},error:null}, last;
globalThis.Deno={serve:h=>{handler=h},env:{get:k=>({SUPABASE_URL:'http://x',SUPABASE_ANON_KEY:'a',SUPABASE_SERVICE_ROLE_KEY:'s'})[k]}};
globalThis.__rpc=async(fn,args)=>{last={fn,args};return next};
await import('./payment-duplicate-resolve.ts');
const P='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const call=async(b,auth='Bearer t')=>{const r=await handler(new Request('http://x',{method:'POST',headers:auth?{Authorization:auth}:{},body:typeof b==='string'?b:JSON.stringify(b)}));return {status:r.status,json:await r.json()}};
let r=await call({paymentId:P,decision:'not_duplicate'});
assert.equal(r.status,200); assert.equal(r.json.ok,true);
assert.deepEqual(last,{fn:'payverify_resolve_duplicate',args:{p_payment_id:P,p_user_id:'u1',p_decision:'not_duplicate'}});
assert.equal((await call({paymentId:P,decision:'otra'})).status,400);
assert.equal((await call({paymentId:'x',decision:'duplicate'})).status,400);
assert.equal((await call('null')).status,400);
assert.equal((await call({paymentId:P,decision:'duplicate'},null)).status,401);
for(const [msg,st] of [['forbidden',403],['payment_not_found',404],['not_possible_duplicate',409],['boom',500]]){
  next={data:null,error:{message:msg}}; r=await call({paymentId:P,decision:'duplicate'}); assert.equal(r.status,st,`${msg} -> ${r.status}`);
}
console.log('OK   payment-duplicate-resolve valida entrada y mapea errores');
