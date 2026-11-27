// organization-create: tope de organizaciones por usuario (cliente simulado).
import assert from 'node:assert/strict';
import {db} from './supabase-stub.mjs';
let handler, env={SUPABASE_URL:'http://x',SUPABASE_ANON_KEY:'a',SUPABASE_SERVICE_ROLE_KEY:'s'};
globalThis.Deno={serve:h=>{handler=h},env:{get:k=>env[k]}};
await import('./organization-create.ts');
db.pv_organizations=[]; db.pv_organization_members=[];
const call=async b=>{const r=await handler(new Request('http://x',{method:'POST',headers:{Authorization:'Bearer t'},body:JSON.stringify(b)}));return {status:r.status,json:await r.json()}};
for(let i=1;i<=5;i++){const r=await call({name:'Org '+i}); assert.equal(r.status,201,`org ${i}: ${r.status}`);}
let r=await call({name:'Org 6'});
assert.equal(r.status,409); assert.equal(r.json.error,'organization_limit_reached'); assert.equal(r.json.limit,5);
assert.equal(db.pv_organizations.length,5);
// Ser miembro (no owner) de otras organizaciones no cuenta.
db.pv_organization_members.push({organization_id:'z',user_id:'u2',role:'owner'});
env.PAYVERIFY_MAX_ORGS_PER_USER='7';
r=await call({name:'Org 6'}); assert.equal(r.status,201);
r=await call({name:'x'}); assert.equal(r.status,400);
console.log('OK   organization-create respeta el tope por usuario');
