// device-revoke: revoca activos y también rechaza pendientes (cliente simulado).
import assert from 'node:assert/strict';
import {db} from './supabase-stub.mjs';
let handler;
globalThis.Deno={serve:h=>{handler=h},env:{get:k=>({SUPABASE_URL:'http://x',SUPABASE_ANON_KEY:'a',SUPABASE_SERVICE_ROLE_KEY:'s'})[k]}};
await import('./device-revoke.ts');
const ORG='11111111-1111-4111-8111-111111111111';
const D=n=>`aaaaaaa${n}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
db.pv_devices=[{id:D(1),organization_id:ORG,device_status:'active'},{id:D(2),organization_id:ORG,device_status:'pending'},{id:D(3),organization_id:ORG,device_status:'revoked'}];
const call=async b=>{const r=await handler(new Request('http://x',{method:'POST',headers:{Authorization:'Bearer t'},body:JSON.stringify(b)}));return {status:r.status,json:await r.json()}};
let r=await call({deviceId:D(1)}); assert.equal(r.status,200); assert.equal(db.pv_devices[0].device_status,'revoked');
r=await call({deviceId:D(2)}); assert.equal(r.status,200,'pendiente debe poder rechazarse'); assert.equal(db.pv_devices[1].device_status,'revoked');
assert.equal(db.pv_audit_logs.at(-1).action,'device_enrollment_rejected');
r=await call({deviceId:D(3)}); assert.equal(r.status,409); assert.equal(r.json.error,'device_not_active');
r=await call({deviceId:'x'}); assert.equal(r.status,400);
console.log('OK   device-revoke revoca activos y rechaza pendientes');
