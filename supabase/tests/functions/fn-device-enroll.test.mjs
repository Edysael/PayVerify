// device-enroll: idempotente por nombre y con tope de pendientes (cliente simulado).
import assert from 'node:assert/strict';
import {db} from './supabase-stub.mjs';
let handler;
globalThis.Deno={serve:h=>{handler=h},env:{get:k=>({SUPABASE_URL:'http://x',SUPABASE_ANON_KEY:'a',SUPABASE_SERVICE_ROLE_KEY:'s'})[k]}};
await import('./device-enroll.ts');
const ORG='11111111-1111-4111-8111-111111111111';
db.pv_devices=[];
const call=async b=>{const r=await handler(new Request('http://x',{method:'POST',headers:{Authorization:'Bearer t'},body:JSON.stringify(b)}));return {status:r.status,json:await r.json()}};
const a=await call({organizationId:ORG,deviceName:'Tel A'}); assert.equal(a.status,201);
const a2=await call({organizationId:ORG,deviceName:' Tel A '}); assert.equal(a2.status,200); assert.equal(a2.json.deviceId,a.json.deviceId); assert.equal(a2.json.duplicate,true);
assert.equal(db.pv_devices.length,1);
assert.equal((await call({organizationId:ORG,deviceName:'Tel B'})).status,201);
assert.equal((await call({organizationId:ORG,deviceName:'Tel C'})).status,201);
const d=await call({organizationId:ORG,deviceName:'Tel D'}); assert.equal(d.status,409); assert.equal(d.json.error,'too_many_pending_devices');
// Uno aprobado deja de contar como pendiente.
db.pv_devices[0].device_status='active';
assert.equal((await call({organizationId:ORG,deviceName:'Tel D'})).status,201);
assert.equal((await call({organizationId:ORG,deviceName:''})).status,400);
console.log('OK   device-enroll es idempotente y limita pendientes');
